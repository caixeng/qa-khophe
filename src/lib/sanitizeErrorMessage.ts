export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/(?:Bearer\s+)[^\s,;]+/gi, 'Bearer [ẩn]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[token ẩn]')
    .replace(/((?:password|passwd|token|api[_-]?key|secret)\s*[=:]\s*)[^\s,;]+/gi, '$1[ẩn]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email ẩn]')
    .replace(/https?:\/\/[^\s]+/gi, '[url ẩn]')
    .slice(0, 500);
}
