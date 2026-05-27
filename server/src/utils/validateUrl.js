const ALLOWED = ['http:', 'https:'];

export function isValidUrl(str) {
  if (!str) return true;          // 빈값은 허용 (선택 필드)
  try {
    return ALLOWED.includes(new URL(str).protocol);
  } catch {
    return false;
  }
}

// URL 필드 배열을 검증 후 에러 문자열 반환, 이상 없으면 null
export function checkUrls(obj, fields) {
  for (const f of fields) {
    if (obj[f] && !isValidUrl(obj[f]))
      return `${f}: http/https URL만 허용됩니다.`;
  }
  return null;
}
