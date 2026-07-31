/**
 * 영상 URL 검사 · 유튜브 영상 id 추출.
 * 관리자 등록과 선수 본인 등록이 같은 규칙을 쓰도록 한 곳에 둔다.
 */

/** 지원하는 유튜브 주소 형태에서 영상 id를 뽑는다. 못 뽑으면 null. */
export function youtubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,   // watch?v=ID
    /youtu\.be\/([\w-]{11})/,                        // youtu.be/ID
    /youtube\.com\/embed\/([\w-]{11})/,              // embed/ID
    /youtube\.com\/shorts\/([\w-]{11})/,             // shorts/ID
    /youtube\.com\/live\/([\w-]{11})/,               // live/ID
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/**
 * 등록 가능한 URL인지 확인한다.
 * @returns {{ ok: true, url: string, videoId: string|null } | { ok: false, error: string }}
 */
export function normalizeVideoUrl(raw) {
  const url = String(raw ?? '').trim();
  if (!url) return { ok: false, error: '영상 주소를 입력해주세요.' };
  if (url.length > 500) return { ok: false, error: '주소가 너무 깁니다.' };

  let parsed;
  try { parsed = new URL(url); } catch { return { ok: false, error: '올바른 주소가 아닙니다. https:// 로 시작하는 링크를 넣어주세요.' }; }
  if (!['http:', 'https:'].includes(parsed.protocol))
    return { ok: false, error: 'http/https 주소만 등록할 수 있습니다.' };

  return { ok: true, url, videoId: youtubeId(url) };
}
