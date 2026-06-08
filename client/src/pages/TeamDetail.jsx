import { useParams, Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Trophy, Users, Search } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { SkeletonList } from '../components/Skeleton.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import TeamLogo from '../components/TeamLogo.jsx';

const POSITION_COLOR = {
  대장: { bg: 'bg-black-700',     text: 'text-orange-500' },
  부장: { bg: 'bg-blue-600',      text: 'text-white' },
  중견: { bg: 'bg-emerald-600',   text: 'text-white' },
  이봉: { bg: 'bg-orange-500',    text: 'text-black' },
  선봉: { bg: 'bg-red-500',       text: 'text-white' },
};

function StatCard({ label, value, icon, gold }) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2.5">
      <div className={`flex-shrink-0 ${gold ? 'text-amber-300' : 'text-white/70'}`}>
        {icon}
      </div>
      <div>
        <p className={`text-xl font-black leading-none ${gold ? 'text-amber-300' : 'text-white'}`}>
          {value ?? '—'}
        </p>
        <p className="text-white/50 text-[11px] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function TeamDetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const { data: team, loading } = useFetch(() => api.team(slug), [slug]);

  if (loading) return (
    <main className="page-body px-4 pt-14">
      <SkeletonList count={4} />
    </main>
  );

  if (!team) return (
    <main className="page-body bg-black px-4 flex flex-col items-center justify-center gap-3 min-h-[60vh]">
      <p className="text-white/40 text-sm">팀을 찾을 수 없습니다.</p>
      <button onClick={() => navigate(-1)} className="text-orange-500 text-sm font-semibold">← 뒤로</button>
    </main>
  );

  const players = team.players ?? [];


  return (
    <>
      {/* ── 히어로 배너 (팀 색상 유지) ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${team.color_primary} 0%, ${team.color_primary}bb 100%)` }}
      >
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 flex items-center gap-0.5 text-white/80 active:opacity-60 z-10"
        >
          <ChevronLeft size={20} />
          <span className="text-sm">뒤로</span>
        </button>
        <button
          onClick={() => navigate('/search')}
          className="absolute top-11 right-4 w-9 h-9 flex items-center justify-center rounded-full text-white/80 hover:bg-white/10 active:opacity-60 z-10"
          aria-label="선수 검색"
        >
          <Search size={20} />
        </button>

        <div className="px-5 pt-24 pb-6 relative z-10">
          <TeamLogo
            name={team.name}
            color={team.color_primary}
            size={80}
            rounded="2xl"
            className="mb-4 ring-2 ring-white/20"
          />
          <h1 className="text-white font-black text-2xl leading-tight">{team.name}</h1>
          <p className="text-white/60 text-sm mt-0.5">{team.region} · 창단 {team.founded_year}</p>

          <div className="grid grid-cols-2 gap-2 mt-5">
            <StatCard label="우승"     value={team.championships} icon={<Trophy size={16} />} gold />
            <StatCard label="소속 선수" value={players.length}    icon={<Users  size={16} />} />
          </div>
        </div>
      </div>

      {/* ── 선수 목록 ── */}
      <main className="bg-black px-4 pt-5 pb-6">
        <h2 className="text-xs font-semibold text-white/35 uppercase tracking-wide mb-3">소속 선수</h2>

        {players.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-8">등록된 선수가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {players.map((p) => {
              const pc = POSITION_COLOR[p.position];
              return (
                <Link
                  key={p.id}
                  to={`/players/${p.slug}`}
                  className="pressable bg-black-900 border border-black-700 rounded-2xl p-4
                             flex items-center gap-3"
                >
                  <PlayerAvatar slug={p.slug} name={p.name} color={team.color_primary} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">{p.name}</span>
                      {p.position && pc && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${pc.bg} ${pc.text}`}>
                          {p.position}
                        </span>
                      )}
                    </div>
                    <p className="text-white/40 text-xs mt-0.5">
                      {p.dan_grade}단{p.birth_year ? ` · ${p.birth_year}년생` : ''}
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-white/20 flex-none" />
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
