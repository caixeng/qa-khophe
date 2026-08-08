import { supabase } from '../lib/supabase';

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

export const attachmentsService = {
  async upload(file: File, refType: AttachmentRefType, refId: string): Promise<Attachment> {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('Ảnh quá lớn (tối đa 8MB). Thử chụp lại với chất lượng thấp hơn.');
    }
    if (file.type && !ACCEPTED_TYPES.includes(file.type)) {
      throw new Error('Chỉ nhận file ảnh (JPG, PNG, WEBP, HEIC).');
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const path = `${refType}/${refId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false });
    if (uploadError) throw new Error(uploadError.message);

    const { data, error } = await supabase
      .from('attachments')
      .insert({ ref_type: refType, ref_id: refId, storage_path: path, file_name: file.name })
      .select()
      .single();

    if (error) {
      // Ghi metadata thất bại thì dọn luôn file vừa tải lên — không để rác mồ
      // côi trong storage (best-effort, không chặn nếu dọn cũng lỗi).
      void supabase.storage.from(BUCKET).remove([path]);
      throw new Error(error.message);
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

    if (error) throw new Error(error.message);

    return Promise.all(
      (data || []).map(async (a) => ({
        ...a,
        url: await getSignedUrl(a.storage_path),
      })),
    );
  },

  async remove(attachment: Pick<Attachment, 'id' | 'storage_path'>): Promise<void> {
    const { error } = await supabase.from('attachments').delete().eq('id', attachment.id);
    if (error) throw new Error(error.message);
    // Xoá file vật lý sau khi đã xoá được bản ghi metadata — best-effort.
    void supabase.storage.from(BUCKET).remove([attachment.storage_path]);
  },
};
