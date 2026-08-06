import { describe, it, expect } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';
import { describeError, throwIfError, ServiceError } from './serviceError';

function pgError(code: string, message = 'db error'): PostgrestError {
  return { code, message, details: '', hint: '' } as PostgrestError;
}

describe('describeError', () => {
  it('phân biệt được lỗi thiếu quyền với lỗi khác', () => {
    // Ba tình huống này người ở xưởng phải xử lý khác nhau, nên thông báo
    // không được gộp chung thành "đã có lỗi xảy ra".
    const msg = describeError(pgError('42501'), 'xoá phiếu nhập');
    expect(msg).toContain('không có quyền');
    expect(msg).toContain('xoá phiếu nhập');
  });

  it('giải thích lỗi ràng buộc dữ liệu bằng ngôn ngữ nghiệp vụ', () => {
    const msg = describeError(pgError('23514'), 'thêm phiếu xay');
    expect(msg).toContain('không hợp lệ');
    expect(msg).toContain('sản lượng xay');
  });

  it('nhận ra bảng chưa tồn tại là do thiếu migration', () => {
    expect(describeError(pgError('42P01'), 'tải danh sách')).toContain('migration');
  });

  it('nhận ra mất mạng từ thông điệp fetch của trình duyệt', () => {
    const msg = describeError(new Error('Failed to fetch'), 'tải danh sách phiếu nhập');
    expect(msg).toContain('Mất kết nối');
    expect(msg).toContain('Thử lại');
  });

  it('vẫn trả câu có nghĩa với mã lỗi lạ', () => {
    const msg = describeError(pgError('XX999', 'internal boom'), 'lưu phiếu');
    expect(msg).toContain('lưu phiếu');
    expect(msg).toContain('internal boom');
  });
});

describe('throwIfError', () => {
  it('không làm gì khi truy vấn thành công', () => {
    expect(() => throwIfError(null, 'tải danh sách')).not.toThrow();
  });

  it('ném ServiceError kèm mã lỗi gốc để còn debug được', () => {
    try {
      throwIfError(pgError('23505'), 'thêm đối tác');
      throw new Error('đáng lẽ phải ném lỗi');
    } catch (e) {
      expect(e).toBeInstanceOf(ServiceError);
      expect((e as ServiceError).code).toBe('23505');
      expect((e as ServiceError).message).toContain('đã tồn tại');
    }
  });
});
