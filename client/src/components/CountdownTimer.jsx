import { useState, useEffect } from 'react';

function secondsLeft(deadline) {
  return Math.max(0, Math.floor((new Date(deadline) - Date.now()) / 1000));
}

function format(seconds) {
  if (seconds <= 0) return '마감';
  if (seconds < 3600) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }
  const days = Math.floor(seconds / 86400);
  return `D-${days}`;
}

// deadline: ISO 문자열 or null
export default function CountdownTimer({ deadline, className = '' }) {
  const [sec, setSec] = useState(() => deadline ? secondsLeft(deadline) : null);

  useEffect(() => {
    if (!deadline) return;
    setSec(secondsLeft(deadline));
    const id = setInterval(() => setSec(secondsLeft(deadline)), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;
  return <span className={className}>{format(sec)}</span>;
}
