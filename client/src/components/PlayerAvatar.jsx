import { useState } from 'react';

const DICEBEAR = 'https://api.dicebear.com/9.x/micah/svg';

export default function PlayerAvatar({ slug, name, color, size = 44, className = '' }) {
  const [failed, setFailed] = useState(false);

  const style = { width: size, height: size, background: color ?? '#0A1F44', flexShrink: 0 };

  if (failed || !slug) {
    return (
      <div
        className={`rounded-full flex items-center justify-center text-white font-bold ${className}`}
        style={style}
      >
        <span style={{ fontSize: size * 0.38 }}>{name?.[0]}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-full overflow-hidden ${className}`} style={style}>
      <img
        src={`${DICEBEAR}?seed=${encodeURIComponent(slug)}&backgroundColor=transparent`}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
