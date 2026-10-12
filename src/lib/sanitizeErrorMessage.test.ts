import { it, expect } from 'vitest';
import { sanitizeErrorMessage } from './sanitizeErrorMessage';
it('redacts credentials, emails and URL queries before centralized logging', () => {
  const result = sanitizeErrorMessage(
    'password=abc token=xyz Bearer def foo@example.com https://x.test/?secret=value',
  );
  for (const secret of ['abc', 'xyz', 'def', 'foo@example.com', 'secret=value'])
    expect(result).not.toContain(secret);
});
