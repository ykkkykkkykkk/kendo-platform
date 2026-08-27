import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { styleOf } from '../utils/fanGrade.js';

/**
 * 찐팬 명단 — 100일 이상 응원한 사람만. 오래 응원한 순.
 *
 * 아무도 없으면 섹션 자체를 그리지 않는다. 빈 채로 두면 "아직 아무도 없음"이
 * 선수 프로필에 계속 박혀 있게 되는데, 그건 선수에게 좋을 게 없다.
 */
export default function TrueFansSection({ playerId, playerName }) {
  const [fans, setFans] = useState([]);

  useEffect(() => {
    if (!playerId) return;
    let alive = true;
    api.trueFans(playerId)
      .then((d) => { if (alive && Array.isArray(d)) setFans(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [playerId]);

  if (fans.length === 0) return null;

  const gold = styleOf('gold');

  return (
    <section className="mt-8">
      <div className="flex items-baseline gap-2 mb-3">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">TRUE FANS</p>
        <span className="text-[11px] text-ink-400">
          {playerName} 선수를 100일 이상 응원한 찐팬
        </span>
      </div>

      <div className="pt-4" style={{ borderTop: '1.5px solid #111111' }}>
        <div className="flex flex-wrap gap-2">
          {fans.map((f) => (
            <span
              key={f.nickname}
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5"
              style={{ background: gold.bg, borderColor: gold.border }}
            >
              <span className="text-[13px]">🥇</span>
              <span className="text-[12px] font-bold" style={{ color: gold.fg }}>
                {f.nickname}
              </span>
              <span className="text-[11px] tabular-nums" style={{ color: gold.fg, opacity: 0.7 }}>
                {f.days}일
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
