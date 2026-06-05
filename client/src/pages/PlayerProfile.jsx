import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Share2, Heart, Search,
  Trophy, Calendar,
  AtSign, PlayCircle,
} from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api, authGet, authPost, authDelete } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';
import { SkeletonList } from '../components/Skeleton.jsx';
import PlayerAvatar    from '../components/PlayerAvatar.jsx';
import PlayerComments  from '../components/PlayerComments.jsx';

const GEAR_ICON = { 죽도: '🎋', 호구: '🛡️', 도복: '👘', 하카마: '🥋', 기타: '📦' };

function useDarkBody() {
  useEffect(() => {
    document.body.classList.add('predict-dark');
    return () => document.body.classList.remove('predict-dark');
  }, []);
}

function BioText({ text }) {
  const parts = text.split(/([""][^""]*[""])/);
  return (
    <p className="text-white/70 text-sm leading-relaxed">
      {parts.map((part, i) =>
        /^[""]/.test(part)
          ? <strong key={i} className="text-orange-500 font-bold">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </p>
  );
}

function SnsBtn({ href, icon: Icon, disabled }) {
  const cls = `w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
    disabled
      ? 'bg-black-700/40 text-white/20 cursor-not-allowed'
      : 'bg-black-700 text-white/60 active:bg-black-800'
  }`;
  if (disabled) return <div className={cls}><Icon size={16} /></div>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      <Icon size={16} />
    </a>
  );
}

function ClinicCard({ clinic, booked, onBook, onCancel }) {
  const full = clinic.status === '마감' ||
               (clinic.remaining_slots !== null && clinic.remaining_slots <= 0);
  const dateStr = clinic.scheduled_at
    ? new Date(clinic.scheduled_at).toLocaleDateString('ko-KR', {
        month: 'long', day: 'numeric', weekday: 'short',
      })
    : null;

  return (
    <div className="bg-black-900 border border-black-700 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">{clinic.title}</p>
          {dateStr && (
            <p className="text-white/40 text-xs mt-1">
              {dateStr}{clinic.venue ? ` · ${clinic.venue}` : ''}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {clinic.price_krw > 0 && (
              <span className="text-xs font-semibold text-white">
                {clinic.price_krw.toLocaleString()}원
              </span>
            )}
            {clinic.remaining_slots !== null && (
              <span className={`text-xs ${clinic.remaining_slots <= 3 ? 'text-red-400 font-semibold' : 'text-white/40'}`}>
                {clinic.remaining_slots}자리 남음
              </span>
            )}
          </div>
        </div>

        {booked ? (
          <button
            onClick={() => onCancel(clinic.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-black-700 text-white/50 active:opacity-70"
          >
            예약취소
          </button>
        ) : (
          <button
            onClick={() => onBook(clinic.id)}
            disabled={full}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
              full
                ? 'bg-black-700 text-white/30 cursor-not-allowed'
                : 'bg-orange-500 text-black active:opacity-80'
            }`}
          >
            {full ? '마감' : '신청'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlayerProfile({ onLoginRequest }) {
  useDarkBody();
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const { user }     = useAuth();
  const { showToast } = useToast();

  const { data: player, loading } = useFetch(() => api.player(slug), [slug]);

  const [followed,      setFollowed]      = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [clinics,       setClinics]       = useState([]);
  const [myBookings,    setMyBookings]    = useState(new Set());

  useEffect(() => {
    if (!user || !player?.id) return;
    authGet(`/follows/check/${player.id}`)
      .then((data) => { if (typeof data.followed === 'boolean') setFollowed(data.followed); })
      .catch(() => {});
  }, [user?.id, player?.id]);

  useEffect(() => {
    if (!player?.id) return;
    authGet(`/clinics?player_id=${player.id}`)
      .then((data) => { if (Array.isArray(data)) setClinics(data); })
      .catch(() => {});
  }, [player?.id]);

  useEffect(() => {
    if (!user || !player?.id) return;
    authGet(`/clinics/my-bookings?player_id=${player.id}`)
      .then((data) => { if (Array.isArray(data)) setMyBookings(new Set(data)); })
      .catch(() => {});
  }, [user?.id, player?.id]);

  const toggleFollow = async () => {
    if (!user) { onLoginRequest?.(); return; }
    haptic();
    setFollowLoading(true);
    try {
      if (followed) {
        await authDelete(`/follows/${player.id}`);
        setFollowed(false);
        showToast('팬 등록을 취소했습니다.', 'info');
      } else {
        await authPost('/follows', { playerId: player.id });
        setFollowed(true);
        showToast(`${player.name} 선수의 팬이 되었습니다! 🎋`, 'success');
      }
    } catch { /* 실패 시 상태 유지 */ } finally {
      setFollowLoading(false);
    }
  };

  const handleBook = async (clinicId) => {
    if (!user) { onLoginRequest?.(); return; }
    haptic();
    const res  = await authPost(`/clinics/${clinicId}/booking`, {});
    const data = await res.json();
    if (res.ok) {
      setMyBookings((prev) => new Set([...prev, clinicId]));
      showToast('클리닉 예약이 완료되었습니다! 🥋', 'success');
    } else {
      showToast(data.error ?? '예약에 실패했습니다.', 'error');
    }
  };

  const handleCancel = async (clinicId) => {
    haptic();
    const res  = await authDelete(`/clinics/${clinicId}/booking`);
    const data = await res.json();
    if (res.ok) {
      setMyBookings((prev) => { const s = new Set(prev); s.delete(clinicId); return s; });
      showToast('예약이 취소되었습니다.', 'info');
    } else {
      showToast(data.error ?? '취소에 실패했습니다.', 'error');
    }
  };

  /* ── 로딩 ── */
  if (loading) return (
    <main className="page-body bg-black px-4 pt-14">
      <SkeletonList count={5} />
    </main>
  );

  /* ── 404 ── */
  if (!player) return (
    <main className="page-body bg-black px-4 flex flex-col items-center justify-center gap-3 min-h-[60vh]">
      <p className="text-white/40 text-sm">선수를 찾을 수 없습니다.</p>
      <button onClick={() => navigate(-1)} className="text-orange-500 text-sm font-semibold">← 뒤로</button>
    </main>
  );

  const { stats, gear = [] } = player;
  const winRate     = stats?.total_matches > 0
    ? Math.round((stats.wins / stats.total_matches) * 100)
    : null;
  const fanCount    = player.fan_count ?? 0;
  const clinicCount = player.clinic_count ?? 0;

  return (
    <>
      {/* ════════════════════════════════════════
          1. 히어로 (배경 다크)
      ════════════════════════════════════════ */}
      <div className="relative w-full overflow-hidden" style={{ height: 320 }}>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0F0F0F] to-[#1A1A1A]" />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <PlayerAvatar
            slug={player.slug}
            name={player.name}
            color="transparent"
            size={200}
            className="opacity-15"
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0A0A0A] to-transparent" />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-0.5 text-white active:opacity-60"
          >
            <ChevronLeft size={20} />
            <span className="text-sm">뒤로</span>
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/search')} className="text-white/70 active:text-white" aria-label="선수 검색">
              <Search size={18} />
            </button>
            <button className="text-white/70 active:text-white"><Share2 size={18} /></button>
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className={followed ? 'text-orange-500' : 'text-white/70 active:text-white'}
            >
              <Heart size={18} fill={followed ? '#FF8800' : 'none'} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5 z-10">
          <div className="flex items-end gap-3 mb-2">
            <PlayerAvatar
              slug={player.slug}
              name={player.name}
              color={player.color_primary}
              size={56}
              className="border-2 border-white/20 shadow-lg flex-shrink-0"
            />
            <div>
              {player.position && (
                <span className="inline-flex items-center gap-1 bg-orange-500 text-black font-bold text-[11px] px-2.5 py-0.5 rounded-full mb-1">
                  ● {player.position}
                </span>
              )}
              <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                {player.name}
              </h1>
            </div>
          </div>
          {player.name_en && (
            <p className="text-[11px] text-white/40 uppercase tracking-widest mt-0.5">
              {player.name_en}
            </p>
          )}
          <p className="text-sm text-orange-500 mt-1.5">
            {player.team_name} · {player.dan_grade}단
          </p>
          {(player.birth_year || player.height_cm) && (
            <p className="text-xs text-white/50 mt-0.5">
              {[
                player.birth_year && `${player.birth_year}년생`,
                player.height_cm  && `${player.height_cm}cm`,
              ].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          2. 팔로우 + SNS 액션 바
      ════════════════════════════════════════ */}
      <div className="bg-black px-4 py-4 border-b border-black-700">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFollow}
            disabled={followLoading}
            className={`pressable flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-60 ${
              followed
                ? 'bg-black-700 text-white/60'
                : 'bg-orange-500 text-black'
            }`}
          >
            {followed ? '✓ 팬 등록됨' : '+ 팬 등록'}
          </button>

          <div className="flex gap-2">
            <SnsBtn href={player.instagram_url} icon={AtSign}     disabled={!player.instagram_url} />
            <SnsBtn href={player.youtube_url}   icon={PlayCircle} disabled={!player.youtube_url} />
            <button className="w-10 h-10 rounded-full bg-black-700 flex items-center justify-center text-white/60 active:bg-black-800">
              <Calendar size={16} />
            </button>
          </div>
        </div>

        <p className="text-xs text-white/40 mt-2.5 text-center">
          팬 {(fanCount + (followed ? 1 : 0)).toLocaleString()}명
          {clinicCount > 0 && ` · 클리닉 ${clinicCount}회 진행`}
        </p>
      </div>

      {/* ════════════════════════════════════════
          이하 본문
      ════════════════════════════════════════ */}
      <div className="bg-black px-4">

        {/* ── 3. 통산 전적 ── */}
        <div className="bg-black-900 border border-black-700 rounded-2xl p-5 mt-4">
          <h2 className="text-xs font-semibold text-white/35 uppercase tracking-wide mb-4">통산 전적</h2>

          {stats ? (
            <>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: '총경기', value: stats.total_matches,      gold: false },
                  { label: '승',     value: stats.wins,               gold: false },
                  { label: '패',     value: stats.losses,             gold: false },
                  { label: '우승',   value: stats.championships_won,  gold: true  },
                ].map(({ label, value, gold }) => (
                  <div key={label} className="relative text-center">
                    {gold && <Trophy size={12} className="text-amber-300 absolute top-0 right-0" />}
                    <p className={`text-3xl font-black leading-none ${gold ? 'text-amber-300' : 'text-white'}`}>
                      {value}
                    </p>
                    <p className="text-[11px] text-white/40 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {winRate !== null && (
                <>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-bold text-white/50">승률</span>
                    <span className="text-xs font-bold text-white">{winRate}%</span>
                  </div>
                  <div className="h-2 bg-black-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-white/40 text-sm text-center py-2">아직 등록된 전적 정보 없음</p>
          )}
        </div>

        {/* ── 4. 소개 ── */}
        {player.bio && (
          <div className="bg-black-900 border border-black-700 rounded-2xl p-5 mt-3">
            <h2 className="text-xs font-semibold text-white/35 uppercase tracking-wide mb-3">
              <span className="text-orange-500 mr-1">•</span>소개
            </h2>
            <BioText text={player.bio} />
          </div>
        )}

        {/* ── 5. My Gear ── */}
        <div className="mt-3">
          <div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-xs font-semibold text-white/35 uppercase tracking-wide">My Gear</h2>
            <span className="text-[11px] text-white/30">선수가 직접 사용하는 장비</span>
          </div>

          {gear.length > 0 ? (
            <div className="flex flex-col gap-2">
              {gear.map((g) => (
                <div
                  key={g.id}
                  className="bg-black-900 border border-black-700 rounded-xl p-3 flex items-center gap-3 hover:-translate-y-0.5 transition-transform"
                >
                  <div className="w-14 h-14 rounded-xl bg-black-700 flex items-center justify-center text-2xl flex-shrink-0">
                    {GEAR_ICON[g.category] ?? '📦'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wider">
                      {g.category}
                    </p>
                    <p className="text-sm font-semibold text-white truncate mt-0.5">
                      {g.model_name}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">{g.brand}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {g.price_krw && (
                      <p className="text-sm font-bold text-white">
                        {g.price_krw.toLocaleString()}원
                      </p>
                    )}
                    <a
                      href={g.product_url ?? '#'}
                      target={g.product_url ? '_blank' : undefined}
                      rel="noreferrer"
                      onClick={!g.product_url ? (e) => e.preventDefault() : undefined}
                      className={`bg-orange-500 text-black rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                        !g.product_url ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      동일구매
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-black-900 border border-black-700 rounded-2xl p-5 text-center">
              <p className="text-white/40 text-sm">아직 등록된 장비 정보 없음</p>
            </div>
          )}
        </div>

        {/* ── 6. 1:1 클리닉 ── */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-white/35 uppercase tracking-wide">1:1 클리닉</h2>
          </div>

          {clinics.length > 0 ? (
            <div className="flex flex-col gap-2">
              {clinics.map((clinic) => (
                <ClinicCard
                  key={clinic.id}
                  clinic={clinic}
                  booked={myBookings.has(clinic.id)}
                  onBook={handleBook}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          ) : (
            <div className="bg-black-900 border border-black-700 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">예정된 클리닉 없음</p>
                <button className="text-orange-500 text-xs font-semibold mt-1">알림 받기 →</button>
              </div>
              <Calendar size={32} className="text-black-700" />
            </div>
          )}
        </div>

        {/* ── 7. 최근 경기 ── */}
        <div className="mt-4">
          <h2 className="text-xs font-semibold text-white/35 uppercase tracking-wide mb-3">최근 경기</h2>
          <div className="bg-black-900 border border-black-700 rounded-xl p-4 text-center">
            <p className="text-white/40 text-sm">최근 경기 정보가 없습니다.</p>
          </div>
        </div>

        {/* ── 8. 댓글 ── */}
        <PlayerComments slug={player.slug} playerId={player.id} />

      </div>
    </>
  );
}
