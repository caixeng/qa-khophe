import { describe, expect, it } from 'vitest';
import { readAllPages } from './pagination';

describe('whole-period pagination', () => {
  it('continues when the API row cap is smaller than the requested page', async () => {
    const records = Array.from({ length: 1203 }, (_, id) => ({ id }));
    const result = await readAllPages('test', (from, to) =>
      Promise.resolve({ data: records.slice(from, Math.min(to + 1, from + 200)), error: null }),
    );
    expect(result).toEqual(records);
  });
  it('fails explicitly rather than returning a partial financial total at the safety cap', async () => {
    await expect(
      readAllPages('test', () => Promise.resolve({ data: [1, 2], error: null }), { maxRows: 3 }),
    ).rejects.toThrow('vượt giới hạn');
  });
  it('does not return previously loaded pages after a later network failure', async () => {
    await expect(
      readAllPages('test', (from) =>
        from === 0
          ? Promise.resolve({ data: [1], error: null })
          : Promise.reject(new Error('Failed to fetch')),
      ),
    ).rejects.toThrow('Mất kết nối');
  });
});
