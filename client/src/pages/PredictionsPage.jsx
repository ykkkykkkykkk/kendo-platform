import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import CountdownTimer from '../components/CountdownTimer.jsx';
import DivisionTypeBadge from '../components/DivisionTypeBadge.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';

/* ── 다크 body 적용 훅 ─────────────────────────────────────── */
function useDarkBody() {
  useEffect(() => {
    document.body.classList.add('predict-dark');
    return () => document.body.classList.remove('predict-dark');
  }, []);
}

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
  useDarkBody();
  const { data, loading } = useFetch(api.tournamentsWithDivisions);
  const { pickable, live, past } = Array.isArray(data) ? classify(data) : { pickable: [], live: [], past: [] };

  return (
    <main className="page-body bg-black min-h-screen">
      {/* 헤더 */}
      <header className="px-5 pt-12 pb-6">
        <p className="text-[10px] text-orange-500 font-semibold tracking-[0.25em] uppercase">PREDICT</p>
        <h1 className="text-[32px] font-bold text-white leading-tight tracking-tight mt-0.5">예측</h1>
        <p className="text-sm text-white/40 mt-1">우승자를 맞춰보세요</p>
      </header>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div className="px-5 flex flex-col gap-8 pb-4">
          {/* PICK 가능 */}
          {pickable.length > 0 && (
            <section>
              <SectionLabel>PICK 가능</SectionLabel>
              <div className="flex flex-col gap-3">
                {pickable.map((t, i) => (
                  <ScrollReveal key={t.id} delay={i * 0.07}>
                    <PickableCard t={t} />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          )}

          {/* 진행 중 */}
          {live.length > 0 && (
            <section>
              <SectionLabel>진행 중</SectionLabel>
              <div className="flex flex-col gap-3">
                {live.map((t, i) => (
                  <ScrollReveal key={t.id} delay={i * 0.07}>
                    <LiveCard t={t} />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          )}

          {/* 둘 다 없음 */}
          {pickable.length === 0 && live.length === 0 && (
            <p className="text-center text-white/25 text-sm py-12">아직 진행 중인 대회가 없어요</p>
          )}

          {/* 종료된 대회 */}
          {past.length > 0 && (
            <section className="opacity-55">
              <SectionLabel>종료된 대회</SectionLabel>
              <div className="flex flex-col gap-2">
                {past.map((t, i) => (
                  <ScrollReveal key={t.id} delay={i * 0.05}>
                    <PastCard t={t} />
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
    <p className="text-[10px] text-white/35 font-semibold tracking-[0.18em] uppercase mb-3">
      {children}
    </p>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-5 flex flex-col gap-3 animate-pulse">
      <div className="h-44 bg-black-900 rounded-3xl" />
      <div className="h-36 bg-black-900 rounded-3xl" />
      <div className="h-28 bg-black-900 rounded-3xl" />
    </div>
  );
}

/* 픽 가능 카드 (골드 그라데이션) */
function PickableCard({ t }) {
  const picked = pickedCount(t);
  const total  = t.divisions.length;

  return (
    <Link to={`/predictions/${t.id}`} className="pressable block">
      <div className="bg-gradient-to-br from-[#1C1400] to-[#251900]
                      border border-orange-500/20 rounded-3xl p-5">
        {/* 상단: 마감 + 부문 배지 */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {t.pick_deadline ? (
            <span className="inline-flex items-center gap-1 bg-orange-500/15 text-orange-500
                             text-[10px] font-bold px-2.5 py-1 rounded-full">
              ⏱&nbsp;마감&nbsp;<CountdownTimer deadline={t.pick_deadline} />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-white/8 text-white/50
                             text-[10px] font-semibold px-2.5 py-1 rounded-full">
              마감 미정
            </span>
          )}
          {t.divisions.map((d) => (
            <DivisionTypeBadge key={d.division_id} type={d.division_type} dark />
          ))}
        </div>

        {/* 대회명 */}
        <h2 className="text-white font-bold text-[19px] tracking-tight leading-snug">
          {t.name}
        </h2>
        {(t.venue || t.start_date) && (
          <p className="text-white/40 text-xs mt-1">
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
                        d.my_pick_status === 'locked' ? 'bg-orange-500' :
                        d.my_pick_status === 'picked' ? 'bg-orange-500/50' :
                        'bg-white/15'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-white/35 text-xs">{picked}/{total} 부문</span>
              </>
            ) : (
              <span className="text-white/25 text-xs">부문 등록 전</span>
            )}
          </div>
          <span className="text-orange-500 text-sm font-semibold">
            {picked > 0 && picked === total ? '확인하기 →' : '픽 입력 →'}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* 진행 중 카드 (LIVE) */
function LiveCard({ t }) {
  const score  = totalMyScore(t);
  const picked = pickedCount(t);
  const total  = t.divisions.length;

  return (
    <Link to={`/predictions/${t.id}`} className="pressable block">
      <div className="bg-black-900 border border-black-700 rounded-3xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 bg-red-500/12 text-red-400
                           text-[10px] font-bold px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </span>
          <span className="text-white/30 text-xs">{picked}/{total} 부문 픽</span>
        </div>
        <h2 className="text-white font-bold text-[19px] tracking-tight leading-snug">
          {t.name}
        </h2>
        {(t.venue || t.start_date) && (
          <p className="text-white/40 text-xs mt-1">
            {[t.venue, t.start_date].filter(Boolean).join('  ·  ')}
          </p>
        )}
        <div className="flex items-end gap-1.5 mt-3">
          <span className="text-orange-500 font-bold text-2xl leading-none">{score}</span>
          <span className="text-white/30 text-sm mb-0.5">/ 400점</span>
        </div>
      </div>
    </Link>
  );
}

/* 종료된 대회 카드 */
function PastCard({ t }) {
  const score = totalMyScore(t);
  return (
    <Link to={`/predictions/${t.id}`} className="pressable block">
      <div className="bg-black-900 border border-black-700 rounded-2xl p-4
                      flex items-center justify-between">
        <div>
          <h3 className="text-white/70 font-semibold text-sm tracking-tight">{t.name}</h3>
          {t.start_date && (
            <p className="text-white/30 text-[11px] mt-0.5">{t.start_date}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-white/50 text-sm font-semibold">{score}점</p>
          <p className="text-white/25 text-[10px] mt-0.5">결산 보기 →</p>
        </div>
      </div>
    </Link>
  );
}
