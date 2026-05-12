import { useParams, Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';

const POSITION_COLOR = {
  대장: 'bg-navy text-white',
  부장: 'bg-blue-600 text-white',
  중견: 'bg-emerald-600 text-white',
  이봉: 'bg-orange-500 text-white',
  선봉: 'bg-red-500 text-white',
};

export default function TeamDetail() {
  const { slug } = useParams();
  const { data: team, loading } = useFetch(() => api.team(slug), [slug]);

  return (
    <>
      <PageHeader title={team?.name ?? '팀'} />
      <main className="page-body px-4">
        {loading ? (
          <SkeletonList />
        ) : !team ? (
          <p className="text-sub text-sm">팀을 찾을 수 없습니다.</p>
        ) : (
          <>
            {/* 팀 배너 */}
            <div
              className="rounded-xl p-5 mb-5 flex items-center gap-4"
              style={{ background: team.color_primary }}
            >
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-white font-black text-2xl">{team.name[0]}</span>
              </div>
              <div>
                <p className="text-white font-black text-xl">{team.name}</p>
                <p className="text-white/70 text-sm">{team.region}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-white/90 text-xs">창단 {team.founded_year}</span>
                  <span className="text-yellow-300 text-xs font-bold">🏆 {team.championships}회 우승</span>
                </div>
              </div>
            </div>

            {/* 선수 목록 */}
            <h2 className="text-sm font-semibold text-sub uppercase tracking-wide mb-3">소속 선수</h2>
            <div className="flex flex-col gap-3">
              {team.players?.map((p) => (
                <Link
                  key={p.id}
                  to={`/players/${p.slug}`}
                  className="bg-card rounded-xl p-4 flex items-center gap-3 active:opacity-70"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: team.color_primary }}
                  >
                    <span className="text-white font-bold">{p.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-navy">{p.name}</p>
                      {p.position && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${POSITION_COLOR[p.position] ?? 'bg-gray-200 text-gray-600'}`}>
                          {p.position}
                        </span>
                      )}
                    </div>
                    <p className="text-sub text-xs mt-0.5">{p.dan_grade}단 · {p.birth_year}년생</p>
                  </div>
                  {p.total_matches > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-navy font-bold text-sm">{p.wins}승</p>
                      <p className="text-sub text-xs">{p.losses}패</p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
