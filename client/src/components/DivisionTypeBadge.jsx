const CONFIG = {
  male_individual:   { label: '남자개인', lightCls: 'bg-blue-100 text-blue-700',  darkCls: 'bg-blue-500/15 text-blue-400' },
  male_team:         { label: '남자단체', lightCls: 'bg-indigo-100 text-indigo-700', darkCls: 'bg-indigo-500/15 text-indigo-400' },
  female_individual: { label: '여자개인', lightCls: 'bg-pink-100 text-pink-700',  darkCls: 'bg-pink-500/15 text-pink-400' },
  female_team:       { label: '여자단체', lightCls: 'bg-rose-100 text-rose-700',  darkCls: 'bg-rose-500/15 text-rose-400' },
};

// dark: true → 다크 배경용 배지
export default function DivisionTypeBadge({ type, dark = false, className = '' }) {
  const cfg   = CONFIG[type] ?? { label: type, lightCls: 'bg-gray-100 text-gray-600', darkCls: 'bg-gray-500/15 text-gray-400' };
  const color = dark ? cfg.darkCls : cfg.lightCls;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${color} ${className}`}>
      {cfg.label}
    </span>
  );
}
