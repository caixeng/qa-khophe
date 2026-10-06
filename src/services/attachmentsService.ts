import { supabase } from '../lib/supabase';
import { ServiceError } from '../lib/serviceError';

export type AttachmentRefType = 'import' | 'export' | 'expense' | 'advance' | 'weighing_session';

export interface Attachment {
  id: string;
  ref_type: AttachmentRefType;
  ref_id: string;
  storage_path: string;
  file_name: string | null;
  created_at?: string;
  /** URL có hạn (1 giờ) để hiển thị ảnh — bucket không public vì ảnh chuyển
   *  khoản có thể lộ số tài khoản, không nên phát URL đoán được vĩnh viễn. */
  url: string;
}

const BUCKET = 'attachments';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return '';
  return data.signedUrl;
}

/**
 * Lấy signed URLs hàng loạt thay vì gọi từng file — giảm từ N request xuống
 * 1 request duy nhất. Fallback sang gọi từng file nếu batch API không khả dụng.
 */
async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) {
    // Fallback: gọi từng file (tương thích ngược)
    const result: Record<string, string> = {};
    await Promise.all(
      paths.map(async (p) => {
        result[p] = await getSignedUrl(p);
      }),
    );
    return result;
  }

  const result: Record<string, string> = {};
  for (const item of data) {
    if (item.signedUrl && item.path) {
      result[item.path] = item.signedUrl;
    }
  }
  return result;
}

export const attachmentsService = {
  async upload(file: File, refType: AttachmentRefType, refId: string): Promise<Attachment> {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new ServiceError('Ảnh quá lớn (tối đa 8MB). Thử chụp lại với chất lượng thấp hơn.');
    }
    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
      throw new ServiceError('Chỉ nhận file ảnh (JPG, PNG, WEBP, HEIC).');
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const path = `${refType}/${refId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
    if (uploadError) throw new ServiceError(`Tải ảnh lên thất bại: ${uploadError.message}`);

    const { data, error } = await supabase
      .from('attachments')
      .insert({ ref_type: refType, ref_id: refId, storage_path: path, file_name: file.name })
      .select()
      .single();

    if (error) {
      // Ghi metadata thất bại thì dọn luôn file vừa tải lên — không để rác mồ
      // côi trong storage (best-effort, không chặn nếu dọn cũng lỗi).
      void supabase.storage.from(BUCKET).remove([path]);
      throw new ServiceError(`Lưu thông tin ảnh thất bại: ${error.message}`, error.code, error);
    }

    const url = await getSignedUrl(path);
    return { ...data, url };
  },

  async getByRef(refType: AttachmentRefType, refId: string): Promise<Attachment[]> {
    const { data, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('ref_type', refType)
      .eq('ref_id', refId)
      .order('created_at', { ascending: false });

    if (error) throw new ServiceError(`Tải danh sách ảnh thất bại: ${error.message}`, error.code, error);

    const rows = data || [];
    if (rows.length === 0) return [];

    // Batch signed URLs: 1 request thay vì N requests
    const paths = rows.map((a) => a.storage_path);
    const urlMap = await getSignedUrls(paths);

    return rows.map((a) => ({
      ...a,
      url: urlMap[a.storage_path] || '',
    }));
  },

  async remove(attachment: Pick<Attachment, 'id' | 'storage_path'>): Promise<void> {
    const { error } = await supabase.from('attachments').delete().eq('id', attachment.id);
    if (error) throw new ServiceError(`Xoá ảnh thất bại: ${error.message}`, error.code, error);
    // Xoá file vật lý sau khi đã xoá được bản ghi metadata — best-effort.
    void supabase.storage.from(BUCKET).remove([attachment.storage_path]);
  },
};
