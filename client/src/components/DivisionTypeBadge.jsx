const LABELS = {
  male_individual:   '남자개인',
  male_team:         '남자단체',
  female_individual: '여자개인',
  female_team:       '여자단체',
};

// 매거진 스타일: 모노크롬 1px 보더 칩. dark: 반전 블록(#111) 위에서 사용
export default function DivisionTypeBadge({ type, dark = false, className = '' }) {
  const label = LABELS[type] ?? type;
  const color = dark
    ? 'border-white/25 text-white/70'
    : 'border-ink-200 text-ink-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 border text-[10px] font-medium ${color} ${className}`}>
      {label}
    </span>
  );
}
