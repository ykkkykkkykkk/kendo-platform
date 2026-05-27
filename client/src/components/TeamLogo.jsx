// 팀 로고: 그라데이션 배경 + 검도 아이콘(이니셜)
export default function TeamLogo({ name, color, size = 48, rounded = 'xl', className = '' }) {
  const r = `rounded-${rounded}`;
  // 같은 색상 계열에서 밝은 버전과 어두운 버전으로 그라데이션
  const bg = `linear-gradient(145deg, ${color}ff 0%, ${color}bb 60%, ${color}88 100%)`;

  return (
    <div
      className={`flex items-center justify-center flex-shrink-0 shadow-sm ${r} ${className}`}
      style={{ width: size, height: size, background: bg }}
    >
      {/* 검도 심볼: 이니셜 위에 미세한 그라데이션 오버레이 */}
      <span
        className="font-black text-white drop-shadow-sm select-none"
        style={{ fontSize: size * 0.42, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
      >
        {name?.[0]}
      </span>
    </div>
  );
}
