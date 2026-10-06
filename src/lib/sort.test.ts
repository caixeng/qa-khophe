import { describe, it, expect } from 'vitest';
import { sortRows } from './sort';

describe('sort', () => {
  it('sắp xếp tiếng Việt có dấu đúng thứ tự', () => {
    const data = [{ name: 'Ánh' }, { name: 'Ân' }, { name: 'Anh' }];
    const result = sortRows(data, { key: 'name', direction: 'asc' });
    expect(result.map((x) => x.name)).toEqual(['Anh', 'Ánh', 'Ân']);
  });

  it('sắp xếp số tự nhiên đúng (numeric: true)', () => {
    const data = [{ value: '10' }, { value: '2' }, { value: '1' }];
    const result = sortRows(data, { key: 'value', direction: 'asc' });
    expect(result.map((x) => x.value)).toEqual(['1', '2', '10']);
  });

  it('giá trị rỗng luôn bị đẩy xuống cuối', () => {
    const data = [{ val: 1 }, { val: null }, { val: 2 }, { val: '' }, { val: undefined }, { val: 0 }];
    const resultAsc = sortRows(data, { key: 'val', direction: 'asc' });
    // Giá trị hợp lệ (số) ở trên, giá trị rỗng ở dưới
    expect(resultAsc.map(x => x.val).slice(0, 3)).toEqual([0, 1, 2]);
    const emptyAsc = resultAsc.map(x => x.val).slice(3);
    expect(emptyAsc).toContain(null);
    expect(emptyAsc).toContain('');
    expect(emptyAsc).toContain(undefined);

    const resultDesc = sortRows(data, { key: 'val', direction: 'desc' });
    expect(resultDesc.map(x => x.val).slice(0, 3)).toEqual([2, 1, 0]);
    const emptyDesc = resultDesc.map(x => x.val).slice(3);
    expect(emptyDesc).toContain(null);
    expect(emptyDesc).toContain('');
    expect(emptyDesc).toContain(undefined);
  });
});
