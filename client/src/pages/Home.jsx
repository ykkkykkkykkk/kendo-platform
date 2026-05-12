import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { SkeletonCard } from '../components/Skeleton.jsx';

const STATUS_STYLE = {
  진행: 'bg-red-500 text-white',
  예정: 'bg-gold text-white',
  종료: 'bg-gray-300 text-gray-600',
};

export default function Home() {
  const { data: tournaments, loading: tLoad } = useFetch(api.tournaments);
  const { data: players,     loading: pLoad } = useFetch(api.players);

  const featured = players?.filter((p) => p.bio) ?? [];
  const upcoming = tournaments?.filter((t) => t.status !== '종료') ?? [];

  return (
    <main className="page-body">
      {/* 상단 헤더 */}
      <header className="px-4 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-sub font-medium tracking-widest uppercase">Kendo</p>
          <h1 className="text-2xl font-bold text-navy leading-tight">검도 팬덤</h1>
        </div>
        <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center">
          <span className="text-gold text-xs font-bold">검</span>
        </div>
      </header>

      {/* 대회 섹션 */}
      <section className="mt-2 px-4">
        <h2 className="text-sm font-semibold text-sub mb-3 uppercase tracking-wide">대회</h2>
        {tLoad ? (
          <SkeletonCard className="h-28" />
        ) : upcoming.length === 0 ? (
          <p className="text-sub text-sm">진행 중인 대회가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((t) => (
              <Link
                key={t.id}
                to={`/tournaments/${t.slug}`}
                className="bg-navy rounded-xl p-4 flex flex-col gap-1 active:opacity-80"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[t.status]}`}>
                    {t.status}
                  </span>
                  <span className="text-xs text-gray-400">{t.tournament_type}</span>
                </div>
                <p className="text-white font-bold mt-1">{t.name}</p>
                <p className="text-gray-400 text-xs">{t.venue} · {t.start_date}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 주목 선수 가로스크롤 */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold text-sub mb-3 uppercase tracking-wide px-4">주목 선수</h2>
        {pLoad ? (
          <div className="px-4"><SkeletonCard className="h-32" /></div>
        ) : (
          <div className="scroll-x flex gap-3 px-4 pb-1">
            {featured.map((p) => (
              <Link
                key={p.id}
                to={`/players/${p.slug}`}
                className="flex-shrink-0 w-36 bg-card rounded-xl p-3 active:opacity-80"
              >
                <div
                  className="w-full h-20 rounded-lg mb-2 flex items-center justify-center"
                  style={{ background: p.color_primary ?? '#0A1F44' }}
                >
                  <span className="text-3xl text-white font-bold opacity-60">
                    {p.name[0]}
                  </span>
                </div>
                <p className="text-navy font-bold text-sm truncate">{p.name}</p>
                <p className="text-sub text-xs truncate">{p.team_name} · {p.dan_grade}단</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 클리닉 플레이스홀더 */}
      <section className="mt-6 px-4">
        <h2 className="text-sm font-semibold text-sub mb-3 uppercase tracking-wide">강습 일정</h2>
        <div className="bg-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
            <span className="text-gold text-lg">🥋</span>
          </div>
          <div>
            <p className="text-navy font-semibold text-sm">강습 신청 오픈 예정</p>
            <p className="text-sub text-xs">프로 선수 강습 일정을 곧 공개합니다.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
