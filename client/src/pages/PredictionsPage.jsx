import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import CountdownTimer from '../components/CountdownTimer.jsx';
import DivisionTypeBadge from '../components/DivisionTypeBadge.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';

/* ── 대회 분류 ─────────────────────────────────────────────── */
function classify(tournaments) {
  const now = Date.now();
  const pickable = [], live = [], past = [];
  for (const t of tournaments) {
    if (t.status === '종료') { past.push(t); continue; }
    const dl = t.pick_deadline ? new Date(t.pick_deadline).getTime() : null;
    if (dl && now > dl) { live.push(t); continue; }
    pickable.push(t);
  }
  return { pickable, live, past };
}

function totalMyScore(t) {
  return t.divisions.reduce((s, d) => s + (d.my_score ?? 0), 0);
}
function pickedCount(t) {
  return t.divisions.filter((d) => d.my_pick_status !== 'not_picked').length;
}

/* ── 메인 페이지 ───────────────────────────────────────────── */
export default function PredictionsPage() {
  const { data, loading } = useFetch(api.tournamentsWithDivisions);
  const { pickable, live, past } = Array.isArray(data) ? classify(data) : { pickable: [], live: [], past: [] };

  return (
    <main className="page-body bg-paper min-h-screen">
      {/* 헤더 */}
      <header className="px-5 pt-12 pb-6">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">PICK</p>
        <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">예측</h1>
        <p className="text-sm text-ink-400 mt-2">우승자를 맞춰보세요</p>
      </header>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="px-5 flex flex-col gap-10 pb-4">
          {/* PICK 가능 */}
          {pickable.length > 0 && (
            <section>
              <SectionLabel>OPEN — PICK NOW</SectionLabel>
              <div style={{ borderTop: '1.5px solid #111111' }}>
                {pickable.map((t, i) => (
                  <ScrollReveal key={t.id} delay={i * 0.07}>
                    <PickableRow t={t} first={i === 0} />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          )}

          {/* 진행 중 */}
          {live.length > 0 && (
            <section>
              <SectionLabel>LIVE</SectionLabel>
              <div style={{ borderTop: '1.5px solid #111111' }}>
                {live.map((t, i) => (
                  <ScrollReveal key={t.id} delay={i * 0.07}>
                    <LiveRow t={t} first={i === 0} />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          )}

          {/* 둘 다 없음 */}
          {pickable.length === 0 && live.length === 0 && (
            <p className="text-center text-ink-400 text-sm py-12">아직 진행 중인 대회가 없어요</p>
          )}

          {/* 종료된 대회 */}
          {past.length > 0 && (
            <section>
              <SectionLabel>ARCHIVE</SectionLabel>
              <div style={{ borderTop: '1.5px solid #111111' }}>
                {past.map((t, i) => (
                  <ScrollReveal key={t.id} delay={i * 0.05}>
                    <PastRow t={t} first={i === 0} />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

/* ── 서브 컴포넌트 ─────────────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">
      {children}
    </p>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-5 flex flex-col gap-3 animate-pulse">
      <div className="h-40 bg-ink-200/40" />
      <div className="h-32 bg-ink-200/40" />
      <div className="h-24 bg-ink-200/40" />
    </div>
  );
}

/* 픽 가능 행 */
function PickableRow({ t, first }) {
  const picked = pickedCount(t);
  const total  = t.divisions.length;

  return (
    <Link
      to={`/predictions/${t.id}`}
      className={`block py-5 pressable ${first ? '' : 'border-t border-ink-200'}`}
    >
      {/* 상단: 마감 + 부문 칩 */}
      <div className="flex flex-wrap items-center gap-2">
        {t.pick_deadline ? (
          <span className="text-[11px] font-bold text-ink">
            <CountdownTimer deadline={t.pick_deadline} />
          </span>
        ) : (
          <span className="text-[11px] text-ink-400">마감 미정</span>
        )}
        <span className="flex-1" />
        {t.divisions.map((d) => (
          <DivisionTypeBadge key={d.division_id} type={d.division_type} />
        ))}
      </div>

      {/* 대회명 */}
      <h2 className="text-ink font-bold text-2xl tracking-[-0.04em] leading-tight mt-2">
        {t.name}
      </h2>
      {(t.venue || t.start_date) && (
        <p className="text-ink-400 text-xs mt-1">
          {[t.venue, t.start_date].filter(Boolean).join('  ·  ')}
        </p>
      )}

      {/* 진행 상태 + CTA */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {total > 0 ? (
            <>
              <div className="flex gap-1.5">
                {t.divisions.map((d) => (
                  <span
                    key={d.division_id}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      d.my_pick_status === 'locked' ? 'bg-ink' :
                      d.my_pick_status === 'picked' ? 'bg-ink-400' :
                      'bg-ink-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-ink-400 text-xs">{picked}/{total} 부문</span>
            </>
          ) : (
            <span className="text-ink-400 text-xs">부문 등록 전</span>
          )}
        </div>
        <span className="bg-lime text-ink text-xs font-medium rounded-full px-4 py-2">
          {picked > 0 && picked === total ? '확인하기 →' : '픽 입력 →'}
        </span>
      </div>
    </Link>
  );
}

/* 진행 중 행 (LIVE) */
function LiveRow({ t, first }) {
  const score  = totalMyScore(t);
  const picked = pickedCount(t);
  const total  = t.divisions.length;

  return (
    <Link
      to={`/predictions/${t.id}`}
      className={`block py-5 pressable ${first ? '' : 'border-t border-ink-200'}`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.2em] font-semibold text-ink">
          <span className="w-1.5 h-1.5 bg-lime rounded-full animate-pulse" />
          LIVE
        </span>
        <span className="text-ink-400 text-xs">{picked}/{total} 부문 픽</span>
      </div>
      <h2 className="text-ink font-bold text-2xl tracking-[-0.04em] leading-tight mt-2">
        {t.name}
      </h2>
      {(t.venue || t.start_date) && (
        <p className="text-ink-400 text-xs mt-1">
          {[t.venue, t.start_date].filter(Boolean).join('  ·  ')}
        </p>
      )}
      <div className="flex items-end gap-1.5 mt-3">
        <span className="text-ink font-bold text-2xl leading-none tabular-nums">{score}</span>
        <span className="text-ink-400 text-sm mb-0.5">/ 400점</span>
      </div>
    </Link>
  );
}

/* 종료된 대회 행 */
function PastRow({ t, first }) {
  const score = totalMyScore(t);
  return (
    <Link
      to={`/predictions/${t.id}`}
      className={`flex items-center justify-between py-4 pressable ${first ? '' : 'border-t border-ink-200'}`}
    >
      <div>
        <h3 className="text-ink-600 font-semibold text-sm tracking-tight">{t.name}</h3>
        {t.start_date && (
          <p className="text-ink-400 text-[11px] mt-0.5">{t.start_date}</p>
        )}
      </div>
      <div className="text-right">
        <p className="text-ink text-sm font-semibold tabular-nums">{score}점</p>
        <p className="text-ink-400 text-[10px] mt-0.5">결산 보기 →</p>
      </div>
    </Link>
  );
}
