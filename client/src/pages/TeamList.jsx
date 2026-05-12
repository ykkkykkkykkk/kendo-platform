import { Link } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { SkeletonList } from '../components/Skeleton.jsx';

export default function TeamList() {
  const { data: teams, loading } = useFetch(api.teams);

  return (
    <main className="page-body px-4 pt-12">
      <h1 className="text-2xl font-bold text-navy mb-1">실업팀</h1>
      <p className="text-sub text-sm mb-6">국내 주요 검도 실업팀</p>

      {loading ? (
        <SkeletonList count={5} />
      ) : (
        <div className="flex flex-col gap-3">
          {teams?.map((team) => (
            <Link
              key={team.id}
              to={`/teams/${team.slug}`}
              className="bg-card rounded-xl p-4 flex items-center gap-4 active:opacity-70"
            >
              {/* 팀 컬러 뱃지 */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: team.color_primary }}
              >
                <span className="text-white font-bold text-base">
                  {team.name[0]}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-navy">{team.name}</p>
                <p className="text-sub text-xs mt-0.5">{team.region} · 창단 {team.founded_year}</p>
              </div>

              <div className="flex flex-col items-end flex-shrink-0">
                <span className="text-gold font-bold text-sm">{team.championships}회</span>
                <span className="text-sub text-xs">우승</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
