import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Maximize2 } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { teamPhotoSrc } from '../utils/cloudinary.js';
import PhotoZoomModal from '../components/PhotoZoomModal.jsx';
import { SkeletonList } from '../components/Skeleton.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';
import TeamLogo from '../components/TeamLogo.jsx';

/* ══════════════════════════════════════════════
   단체사진 히어로.
   사진이 있는 팀에만 붙는다 — 없으면 이 영역 자체가 안 나오고
   페이지는 예전 그대로 헤더부터 시작한다.
══════════════════════════════════════════════ */
function TeamPhoto({ team, children, onZoom }) {
  const [loaded, setLoaded] = useState(false);
  const src = teamPhotoSrc(team.team_photo_url);

  return (
    <div className="relative w-full bg-block overflow-hidden" style={{ aspectRatio: '16 / 9' }}>
      {!loaded && <div className="absolute inset-0 bg-ink-200 animate-pulse" />}
      <img
        src={src}
        alt={`${team.name} 단체사진`}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* 사진 전체가 누르는 자리. 단체사진은 16:9로 잘려 얼굴이 작으니 크게 볼 수 있어야 한다. */}
      <button
        type="button"
        onClick={onZoom}
        aria-label={`${team.name} 단체사진 크게 보기`}
        className="absolute inset-0 w-full h-full"
      />
      <span className="absolute right-4 bottom-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm
                       flex items-center justify-center pointer-events-none">
        <Maximize2 size={14} className="text-white" />
      </span>
      {/* 이름은 바로 아래 헤드라인이 맡는다. 여기 그라데이션은 사진이 종이 배경으로
          자연스럽게 떨어지게 하는 용도라, 글씨를 받칠 때보다 훨씬 옅다. */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 45%)' }}
      />
      {children}
    </div>
  );
}

export default function TeamDetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const { data: team, loading } = useFetch(() => api.team(slug), [slug]);
  const [zoom, setZoom] = useState(false);   // 단체사진 크게 보기

  if (loading) return (
    <main className="page-body bg-paper px-5 pt-14">
      <SkeletonList count={4} />
    </main>
  );

  if (!team) return (
    <main className="page-body bg-paper px-5 flex flex-col items-center justify-center gap-3 min-h-[60vh]">
      <p className="text-ink-400 text-sm">팀을 찾을 수 없습니다.</p>
      <button onClick={() => navigate(-1)} className="text-ink text-sm font-semibold pressable">← 뒤로</button>
    </main>
  );

  const players = team.players ?? [];

  const hasPhoto = !!team.team_photo_url;

  /* 사진 위에 얹는 버튼은 사진이 밝든 어둡든 보이도록 흐린 검정을 깐다 */
  const navBtn = hasPhoto
    ? 'w-9 h-9 flex items-center justify-center rounded-full bg-black/35 backdrop-blur-sm text-white pressable'
    : 'w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable';

  const nav = (
    <div className={`flex items-center justify-between ${
      hasPhoto ? 'absolute left-5 right-5 top-12 z-10' : 'px-5 pt-12'
    }`}>
      <button onClick={() => navigate(-1)} className={navBtn} aria-label="뒤로">
        <ChevronLeft size={18} />
      </button>
      <button onClick={() => navigate('/search')} className={navBtn} aria-label="선수 검색">
        <Search size={16} strokeWidth={1.8} />
      </button>
    </div>
  );

  return (
    <main className="page-body bg-paper min-h-screen">
      {/* ── 단체사진 (있는 팀만) ── */}
      {hasPhoto ? <TeamPhoto team={team} onZoom={() => setZoom(true)}>{nav}</TeamPhoto> : nav}

      {/* ── 팀 헤드라인 ── */}
      <header className="px-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">TEAM</p>
            <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">
              {team.name}
            </h1>
            <p className="text-ink-400 text-sm mt-2">{team.region} · 창단 {team.founded_year}</p>
          </div>
          <TeamLogo
            name={team.name}
            color={team.color_primary}
            size={56}
            rounded="2xl"
            className="flex-none mt-1"
          />
        </div>

        {/* 스탯 — 룰 테이블 */}
        <div className="flex mt-6" style={{ borderTop: '1.5px solid #111111', borderBottom: '1px solid #E5E5E5' }}>
          <div className="flex-1 py-3">
            <p className="text-[9px] tracking-[0.2em] text-ink-400 font-medium">WINS</p>
            <p className="text-ink font-bold text-2xl tabular-nums mt-0.5">{team.championships ?? '—'}</p>
          </div>
          <div className="flex-1 py-3 border-l border-ink-200 pl-4">
            <p className="text-[9px] tracking-[0.2em] text-ink-400 font-medium">PLAYERS</p>
            <p className="text-ink font-bold text-2xl tabular-nums mt-0.5">{players.length}</p>
          </div>
        </div>
      </header>

      {/* ── 선수 목록 ── */}
      <section className="px-5 pt-8 pb-6">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">ROSTER</p>

        {players.length === 0 ? (
          <p className="text-ink-400 text-sm text-center py-8">등록된 선수가 없습니다.</p>
        ) : (
          <div style={{ borderTop: '1.5px solid #111111' }}>
            {players.map((p, i) => (
              <Link
                key={p.id}
                to={`/players/${p.slug}`}
                className={`pressable flex items-center gap-3 py-3.5 ${i > 0 ? 'border-t border-ink-200' : ''}`}
              >
                <PlayerAvatar slug={p.slug} name={p.name} color={team.color_primary} size={40} />
                <div className="flex-1 min-w-0">
                  {/* 선봉·이봉·중견·부장·대장(단체전 오더)은 표시하지 않는다.
                      데이터는 남아 있고 관리자에서만 다룬다. */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-ink text-[15px]">{p.name}</span>
                  </div>
                  {/* 단이 없으면 '단'만 덩그러니 남지 않도록 있는 항목만 이어 붙인다 */}
                  <p className="text-ink-400 text-xs mt-0.5">
                    {[p.dan_grade ? `${p.dan_grade}단` : null,
                      p.birth_year ? `${p.birth_year}년생` : null]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-ink-400 text-sm flex-none">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {zoom && team.team_photo_url && (
        <PhotoZoomModal
          src={team.team_photo_url}
          alt={`${team.name} 단체사진`}
          caption={team.name}
          onClose={() => setZoom(false)}
        />
      )}
    </main>
  );
}
