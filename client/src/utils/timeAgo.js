/**
 * 'YYYY-MM-DD HH:MM:SS'(UTC) → '3분 전'.
 *
 * 서버가 datetime('now')로 넣은 값은 UTC인데 T도 Z도 없어서, 그냥 new Date에
 * 넘기면 브라우저가 현지 시각으로 읽어버린다(한국이면 9시간 미래로 뜬다).
 * 그래서 T를 끼우고 Z를 붙여 UTC임을 명시한다.
 */
export function timeAgo(s) {
  if (!s) return '';
  const t = new Date(String(s).replace(' ', 'T') + 'Z').getTime();
  if (Number.isNaN(t)) return '';

  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1)  return '방금';
  if (min < 60) return `${min}분 전`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;

  // 일주일이 넘으면 상대 시간이 오히려 안 와닿는다. 날짜로 보여준다.
  const d = new Date(t);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
