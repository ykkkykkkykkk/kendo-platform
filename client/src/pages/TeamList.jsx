import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Search } from 'lucide-react';
import { useEffect } from 'react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { SkeletonList } from '../components/Skeleton.jsx';
import TeamLogo from '../components/TeamLogo.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';

function useDarkBody() {
  useEffect(() => {
    document.body.classList.add('predict-dark');
    return () => document.body.classList.remove('predict-dark');
  }, []);
}

const RANK_CONFIG = [
  {
    badge: 'bg-[#231700] border border-amber-400/30',
    icon:  <Trophy size={12} style={{ color: '#FFD700' }} />,
  },
  {
    badge: 'bg-black-700 border border-gray-500/30',
    icon:  <Trophy size={12} style={{ color: '#C0C0C0' }} />,
  },
  {
    badge: 'bg-[#1E1109] border border-amber-700/30',
    icon:  <Trophy size={12} style={{ color: '#CD7F32' }} />,
  },
];

export default function TeamList() {
  useDarkBody();
  const navigate = useNavigate();
  const { data: teams, loading } = useFetch(api.teams);

  return (
    <main className="page-body bg-black min-h-screen px-4 pt-12">

      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] text-orange-500 font-medium tracking-[0.2em] uppercase">Teams</p>
          <h1 className="text-3xl font-bold text-white leading-tight">실업팀</h1>
          <p className="text-white/40 text-sm mt-1">국내 주요 검도 실업팀 · 우승 횟수 순</p>
        </div>
        <button
          onClick={() => navigate('/search')}
          className="mt-1 w-9 h-9 flex items-center justify-center rounded-full bg-black-900 text-white/60 active:opacity-60"
          aria-label="선수 검색"
        >
          <Search size={18} />
        </button>
      </header>

      {loading ? (
        <SkeletonList count={5} />
      ) : (
        <div className="flex flex-col gap-3">
          {teams?.map((team, idx) => {
            const rank = RANK_CONFIG[idx] ?? {
              badge: 'bg-black-700 border border-black-700',
              icon:  <span className="text-white/40 text-xs font-bold leading-none">{idx + 1}</span>,
            };

            return (
              <ScrollReveal key={team.id} delay={Math.min(idx * 0.05, 0.35)}>
              <Link
                to={`/teams/${team.slug}`}
                className="pressable bg-black-900 border border-black-700 rounded-2xl p-4
                           flex items-center gap-4"
              >
                {/* 순위 뱃지 */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center
                                flex-shrink-0 ${rank.badge}`}>
                  {rank.icon}
                </div>

                <TeamLogo
                  name={team.name}
                  color={team.color_primary}
                  size={44}
                  rounded="xl"
                />

                {/* 팀 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white">{team.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {team.region} · 창단 {team.founded_year}
                    {team.player_count > 0 && ` · ${team.player_count}명`}
                  </p>
                </div>

                {/* 우승 횟수 */}
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-orange-500 font-black text-base leading-none">{team.championships}</span>
                  <span className="text-white/40 text-[11px] mt-0.5">우승</span>
                </div>
              </Link>
              </ScrollReveal>
            );
          })}
        </div>
      )}
    </main>
  );
}
