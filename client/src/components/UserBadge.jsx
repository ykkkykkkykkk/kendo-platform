/**
 * 글쓴이 표기 — "닉네임 · 도장명".
 *
 * 도장이 없는 회원이 더 많으므로 도장 부분은 있을 때만 붙인다.
 * 뱃지를 따로 그리지 않고 가운뎃점으로 잇는다 — 목록에서 줄이 늘어나지 않고,
 * 도장 있는 사람만 한 조각 더 붙은 것처럼 자연스럽게 읽힌다.
 */
export default function UserBadge({ nickname, dojoName, size = 'md' }) {
  const sm = size === 'sm';
  return (
    <span className={`inline-flex items-center gap-1 min-w-0 ${sm ? 'text-[11px]' : 'text-[12px]'}`}>
      <span className="font-semibold text-ink truncate">{nickname}</span>
      {dojoName && (
        <>
          <span className="text-ink-200 flex-none">·</span>
          <span className="text-ink-400 truncate">{dojoName}</span>
        </>
      )}
    </span>
  );
}
