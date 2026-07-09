import { useState } from 'react';

const DICEBEAR = 'https://api.dicebear.com/9.x/micah/svg';

export default function PlayerAvatar({ slug, name, color, size = 44, className = '', profileImageUrl }) {
  const [failed, setFailed] = useState(false);

  const style = { width: size, height: size, background: color ?? '#111111', flexShrink: 0 };

  // 실제 프로필 이미지가 있으면 우선 사용
  if (profileImageUrl && !failed) {
    return (
      <div className={`rounded-full overflow-hidden ${className}`} style={style}>
        <img
          src={profileImageUrl}
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

  if (failed && !slug) {
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
