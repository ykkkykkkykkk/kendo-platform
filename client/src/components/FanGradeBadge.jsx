import { styleOf } from '../utils/fanGrade.js';

/** 팬 등급 뱃지. 등급이 없으면(7일 미만) 아무것도 그리지 않는다. */
export default function FanGradeBadge({ grade, size = 'md', showLabel = true }) {
  const s = styleOf(grade);
  if (!s) return null;

  const sm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold whitespace-nowrap ${
        sm ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1'
      }`}
      style={{ background: s.bg, color: s.fg, borderColor: s.border }}
    >
      <span className={sm ? 'text-[11px]' : 'text-[13px]'}>{s.emoji}</span>
      {showLabel && s.label}
    </span>
  );
}
