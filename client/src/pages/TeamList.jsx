import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { SkeletonList } from '../components/Skeleton.jsx';
import TeamLogo from '../components/TeamLogo.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';

const rankNo = (n) => String(n).padStart(2, '0');

export default function TeamList() {
  const navigate = useNavigate();
  const { data: teams, loading } = useFetch(api.teams);

  return (
    <main className="page-body bg-paper min-h-screen px-5 pt-12">

      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">TEAMS</p>
          <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">실업팀</h1>
          <p className="text-ink-400 text-sm mt-2">국내 주요 검도 실업팀 · 우승 횟수 순</p>
        </div>
        <button
          onClick={() => navigate('/search')}
          className="mt-1 w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable"
          aria-label="선수 검색"
        >
          <Search size={16} strokeWidth={1.8} />
        </button>
      </header>

      {loading ? (
        <SkeletonList count={5} />
      ) : (
        <div style={{ borderTop: '1.5px solid #111111' }}>
          {teams?.map((team, idx) => (
            <ScrollReveal key={team.id} delay={Math.min(idx * 0.04, 0.3)}>
              <Link
                to={`/teams/${team.slug}`}
                className={`pressable flex items-center gap-4 py-4 ${idx > 0 ? 'border-t border-ink-200' : ''}`}
              >
                {/* 순위 */}
                <span className={`tabular-nums font-bold flex-none w-8 ${idx < 3 ? 'text-base text-ink' : 'text-sm text-ink-400'}`}>
                  {rankNo(idx + 1)}
                </span>

                <TeamLogo
                  name={team.name}
                  color={team.color_primary}
                  size={40}
                  rounded="xl"
                />

                {/* 팀 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink text-[15px]">{team.name}</p>
                  <p className="text-ink-400 text-xs mt-0.5">
                    {team.region} · 창단 {team.founded_year}
                    {team.player_count > 0 && ` · ${team.player_count}명`}
                  </p>
                </div>

                {/* 우승 횟수 */}
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-ink font-bold text-lg leading-none tabular-nums">{team.championships}</span>
                  <span className="text-ink-400 text-[10px] mt-1 tracking-[0.15em]">WINS</span>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      )}
    </main>
  );
}
