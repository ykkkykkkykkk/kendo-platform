import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { SkeletonCard } from '../components/Skeleton.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function TournamentListPage() {
  const { data: tournaments, loading } = useFetch(api.tournaments);
  const upcoming = tournaments?.filter((t) => t.status !== '종료') ?? [];
  const past     = tournaments?.filter((t) => t.status === '종료') ?? [];

  return (
    <main className="page-body">
      <header className="px-4 pt-12 pb-4">
        <p className="text-[10px] text-gold font-semibold tracking-[0.2em] uppercase">Predict</p>
        <h1 className="text-3xl font-bold text-navy leading-tight">예측</h1>
        <p className="text-sm text-ink-400 mt-1">맞히면 진짜 검도용품을 받아요</p>
        <div className="border-b border-ink-100 mt-4" />
      </header>

      <section className="px-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            <SkeletonCard className="h-36" />
            <SkeletonCard className="h-36" />
          </div>
        ) : upcoming.length === 0 && past.length === 0 ? (
          <EmptyState icon="🏆" title="대회 정보가 없습니다" desc="곧 새 대회가 등록됩니다" />
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <p className="text-[11px] text-ink-400 font-semibold uppercase tracking-wide mb-3">
                  진행 예정
                </p>
                <div className="flex flex-col gap-3 mb-6">
                  {upcoming.map((t) => <TournamentCard key={t.id} t={t} />)}
                </div>
              </>
            )}
            {past.length > 0 && (
              <>
                <p className="text-[11px] text-ink-400 font-semibold uppercase tracking-wide mb-3">
                  종료된 대회
                </p>
                <div className="flex flex-col gap-3 mb-6">
                  {past.map((t) => <TournamentCard key={t.id} t={t} dim />)}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function TournamentCard({ t, dim }) {
  return (
    <Link
      to={`/tournaments/${t.slug}`}
      className={`relative overflow-hidden rounded-2xl p-5 active:opacity-80 flex flex-col gap-2
                  bg-gradient-to-br ${dim ? 'from-ink-600 to-ink-500' : 'from-navy-900 to-navy-700'}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold rounded-l-2xl" />
      <div className="flex items-center justify-between pl-2">
        <span className="text-[11px] font-semibold bg-gold/20 text-gold px-2 py-0.5 rounded-full">
          {t.status}
        </span>
        <span className="text-[11px] border border-gold/40 text-gold/80 rounded-full px-2 py-0.5">
          {t.tournament_type}
        </span>
      </div>
      <p className="text-white font-bold text-xl tracking-tight pl-2 leading-snug">{t.name}</p>
      <p className="text-white/70 text-xs pl-2">
        {t.venue}&nbsp;<span className="text-gold">·</span>&nbsp;{t.start_date}
      </p>
      {!dim && (
        <div className="pl-2 mt-1">
          <span className="text-gold text-xs font-semibold">예측하고 응원하기 →</span>
        </div>
      )}
    </Link>
  );
}
