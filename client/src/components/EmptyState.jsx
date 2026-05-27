export default function EmptyState({ icon = '🔍', title, desc, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 text-center ${className}`}>
      <div className="text-5xl mb-4 select-none">{icon}</div>
      <p className="text-white font-bold text-sm">{title}</p>
      {desc && <p className="text-white/40 text-xs mt-1.5 max-w-[200px]">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
