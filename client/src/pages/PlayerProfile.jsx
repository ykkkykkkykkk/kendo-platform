import { useParams } from 'react-router-dom';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import PageHeader from '../components/PageHeader.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';

const POSITION_COLOR = {
  대장: '#0A1F44', 부장: '#2563EB', 중견: '#059669',
  이봉: '#F97316', 선봉: '#EF4444',
};
const GEAR_ICON = { 죽도: '🎋', 호구: '🛡️', 도복: '👘', 하카마: '🥋', 기타: '📦' };

export default function PlayerProfile() {
  const { slug } = useParams();
  const { data: player, loading } = useFetch(() => api.player(slug), [slug]);

  if (loading) return (
    <>
      <PageHeader title="선수 프로필" />
      <main className="page-body px-4"><SkeletonList /></main>
    </>
  );
  if (!player) return (
    <>
      <PageHeader title="선수 프로필" />
      <main className="page-body px-4"><p className="text-sub text-sm">선수를 찾을 수 없습니다.</p></main>
    </>
  );

  const { stats, gear = [] } = player;
  const winRate = stats?.total_matches > 0
    ? Math.round((stats.wins / stats.total_matches) * 100)
    : null;
  const posColor = POSITION_COLOR[player.position] ?? '#0A1F44';

  return (
    <>
      <PageHeader title={player.name} />
      <main className="page-body px-4">

        {/* 프로필 헤더 */}
        <div className="rounded-xl overflow-hidden mb-4" style={{ background: player.color_primary ?? '#0A1F44' }}>
          <div className="px-5 pt-5 pb-6 flex items-end gap-4">
            <div className="w-20 h-20 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-3xl">{player.name[0]}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-black text-xl">{player.name}</span>
                {player.position && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
                    {player.position}
                  </span>
                )}
              </div>
              <p className="text-white/70 text-sm">{player.team_name}</p>
              <div className="flex gap-3 mt-1 text-xs text-white/60">
                <span>{player.dan_grade}단</span>
                {player.birth_year && <span>{player.birth_year}년생</span>}
                {player.height_cm && <span>{player.height_cm}cm</span>}
              </div>
            </div>
          </div>
        </div>

        {/* 통산 전적 */}
        {stats && (
          <div className="bg-card rounded-xl p-4 mb-4">
            <h2 className="text-xs font-semibold text-sub uppercase tracking-wide mb-3">통산 전적</h2>
            <div className="flex gap-4 mb-3">
              {[
                { label: '총경기', value: stats.total_matches },
                { label: '승',     value: stats.wins, color: '#0A1F44' },
                { label: '패',     value: stats.losses },
                { label: '우승',   value: stats.championships_won, color: '#C9A961' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex-1 text-center">
                  <p className="text-xl font-black" style={{ color: color ?? '#1A1A1A' }}>{value}</p>
                  <p className="text-sub text-xs">{label}</p>
                </div>
              ))}
            </div>
            {winRate !== null && (
              <>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-sub">승률</span>
                  <span className="text-navy font-bold">{winRate}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${winRate}%`, background: posColor }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* 소개 */}
        {player.bio && (
          <div className="bg-card rounded-xl p-4 mb-4">
            <h2 className="text-xs font-semibold text-sub uppercase tracking-wide mb-2">소개</h2>
            <p className="text-navy text-sm leading-relaxed">{player.bio}</p>
          </div>
        )}

        {/* SNS */}
        {(player.instagram_url || player.youtube_url) && (
          <div className="bg-card rounded-xl p-4 mb-4">
            <h2 className="text-xs font-semibold text-sub uppercase tracking-wide mb-3">SNS</h2>
            <div className="flex gap-3">
              {player.instagram_url && (
                <a href={player.instagram_url} target="_blank" rel="noreferrer"
                   className="flex items-center gap-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-medium px-4 py-2 rounded-xl">
                  📸 인스타그램
                </a>
              )}
              {player.youtube_url && (
                <a href={player.youtube_url} target="_blank" rel="noreferrer"
                   className="flex items-center gap-2 bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-xl">
                  ▶ 유튜브
                </a>
              )}
            </div>
          </div>
        )}

        {/* My Gear */}
        {gear.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-sub uppercase tracking-wide mb-3">My Gear</h2>
            <div className="flex flex-col gap-3">
              {gear.map((g) => (
                <div key={g.id} className="bg-card rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                    {GEAR_ICON[g.category] ?? '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-navy text-sm truncate">{g.brand} {g.model_name}</p>
                    <p className="text-sub text-xs">{g.category}</p>
                    {g.price_krw && (
                      <p className="text-gold text-xs font-semibold mt-0.5">
                        {g.price_krw.toLocaleString()}원
                      </p>
                    )}
                  </div>
                  {g.product_url && (
                    <a href={g.product_url} target="_blank" rel="noreferrer"
                       className="flex-shrink-0 bg-navy text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                      구매
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
