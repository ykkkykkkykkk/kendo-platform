import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Share2, Heart, Search,
  Calendar,
  AtSign, PlayCircle,
} from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api, authGet, authPost, authDelete } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { haptic } from '../utils/haptic.js';
import { SkeletonList } from '../components/Skeleton.jsx';
import PlayerAvatar         from '../components/PlayerAvatar.jsx';
import ProfilePhotoUpload  from '../components/ProfilePhotoUpload.jsx';
import InquiryModal        from '../components/InquiryModal.jsx';

function BioText({ text }) {
  const parts = text.split(/([""][^""]*[""])/);
  return (
    <p className="text-ink-600 text-sm leading-relaxed">
      {parts.map((part, i) =>
        /^[""]/.test(part)
          ? <strong key={i} className="text-ink font-bold bg-lime px-0.5">{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </p>
  );
}

function SnsBtn({ href, icon: Icon, disabled }) {
  const cls = `w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${
    disabled
      ? 'border-ink-200/60 text-ink-200 cursor-not-allowed'
      : 'border-ink-200 text-ink pressable'
  }`;
  if (disabled) return <div className={cls}><Icon size={16} /></div>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      <Icon size={16} />
    </a>
  );
}

function ClinicRow({ clinic, booked, onBook, onCancel, first }) {
  const full = clinic.status === '마감' ||
               (clinic.remaining_slots !== null && clinic.remaining_slots <= 0);
  const dateStr = clinic.scheduled_at
    ? new Date(clinic.scheduled_at).toLocaleDateString('ko-KR', {
        month: 'long', day: 'numeric', weekday: 'short',
      })
    : null;

  return (
    <div className={`py-4 ${first ? '' : 'border-t border-ink-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-ink font-bold text-sm leading-tight tracking-tight">{clinic.title}</p>
          {dateStr && (
            <p className="text-ink-400 text-xs mt-1">
              {dateStr}{clinic.venue ? ` · ${clinic.venue}` : ''}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {clinic.price_krw > 0 && (
              <span className="text-xs font-semibold text-ink tabular-nums">
                {clinic.price_krw.toLocaleString()}원
              </span>
            )}
            {clinic.remaining_slots !== null && (
              <span className={`text-xs ${clinic.remaining_slots <= 3 ? 'text-ink font-semibold' : 'text-ink-400'}`}>
                {clinic.remaining_slots}자리 남음
              </span>
            )}
          </div>
        </div>

        {booked ? (
          <button
            onClick={() => onCancel(clinic.id)}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border border-ink-200 text-ink-600 pressable"
          >
            예약취소
          </button>
        ) : (
          <button
            onClick={() => onBook(clinic.id)}
            disabled={full}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium ${
              full
                ? 'border border-ink-200 text-ink-400 cursor-not-allowed'
                : 'bg-lime hover:bg-lime-dark text-ink pressable'
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
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const { user }     = useAuth();
  const { showToast } = useToast();

  const { data: player, loading } = useFetch(() => api.player(slug), [slug]);

  const [followed,      setFollowed]      = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [clinics,       setClinics]       = useState([]);
  const [myBookings,    setMyBookings]    = useState(new Set());
  const [profilePhoto,  setProfilePhoto]  = useState(null);
  const [showInquiry,   setShowInquiry]   = useState(false);

  // 선수 본인 여부
  const isMyProfile = user?.role === 'player' && user?.playerId === player?.id;

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
        showToast(`${player.name} 선수의 팬이 되었습니다!`, 'success');
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
      showToast('클리닉 예약이 완료되었습니다!', 'success');
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
    <main className="page-body bg-paper px-5 pt-14">
      <SkeletonList count={5} />
    </main>
  );

  /* ── 404 ── */
  if (!player) return (
    <main className="page-body bg-paper px-5 flex flex-col items-center justify-center gap-3 min-h-[60vh]">
      <p className="text-ink-400 text-sm">선수를 찾을 수 없습니다.</p>
      <button onClick={() => navigate(-1)} className="text-ink text-sm font-semibold pressable">← 뒤로</button>
    </main>
  );

  const { gear = [] } = player;
  const fanCount    = player.fan_count ?? 0;
  const currentPhoto = profilePhoto ?? player.profile_image_url ?? null;
  const clinicCount = player.clinic_count ?? 0;

  return (
    <main className="page-body bg-paper min-h-screen">
      {/* ════════════════════════════════════════
          1. 헤더 내비
      ════════════════════════════════════════ */}
      <div className="px-5 pt-12 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 pressable"
          aria-label="뒤로"
        >
          <ChevronLeft size={18} className="text-ink" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/search')}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable"
            aria-label="선수 검색"
          >
            <Search size={16} strokeWidth={1.8} />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable">
            <Share2 size={16} strokeWidth={1.8} />
          </button>
          <button
            onClick={toggleFollow}
            disabled={followLoading}
            className={`w-9 h-9 flex items-center justify-center rounded-full border pressable ${
              followed ? 'bg-ink border-ink text-white' : 'border-ink-200 text-ink'
            }`}
          >
            <Heart size={16} fill={followed ? '#FFFFFF' : 'none'} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════
          2. 선수 헤드라인 (초대형 타이포)
      ════════════════════════════════════════ */}
      <header className="px-5 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium uppercase">
              PLAYER{player.position ? ` — ${player.position}` : ''}
            </p>
            <h1 className="text-5xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-2">
              {player.name}
            </h1>
            {player.name_en && (
              <p className="text-[10px] text-ink-400 uppercase tracking-[0.2em] mt-2">
                {player.name_en}
              </p>
            )}
            <p className="text-sm text-ink font-semibold mt-3">
              {player.team_name} · {player.dan_grade}단
            </p>
            {(player.birth_year || player.height_cm) && (
              <p className="text-xs text-ink-400 mt-0.5">
                {[
                  player.birth_year && `${player.birth_year}년생`,
                  player.height_cm  && `${player.height_cm}cm`,
                ].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <PlayerAvatar
            slug={player.slug}
            name={player.name}
            color={player.color_primary}
            size={72}
            className="flex-none mt-1 border border-ink-200"
            profileImageUrl={currentPhoto}
          />
        </div>

        {/* 팬 등록 + SNS */}
        {isMyProfile && (
          <div className="mt-4">
            <ProfilePhotoUpload
              currentUrl={currentPhoto}
              onSuccess={(url) => setProfilePhoto(url)}
            />
          </div>
        )}
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={toggleFollow}
            disabled={followLoading}
            className={`pressable flex-1 py-2.5 rounded-full text-sm font-medium transition-colors disabled:opacity-60 ${
              followed
                ? 'border border-ink text-ink'
                : 'bg-lime hover:bg-lime-dark text-ink'
            }`}
          >
            {followed ? '✓ 팬 등록됨' : '+ 팬 등록'}
          </button>

          <div className="flex gap-2">
            <SnsBtn href={player.instagram_url} icon={AtSign}     disabled={!player.instagram_url} />
            <SnsBtn href={player.youtube_url}   icon={PlayCircle} disabled={!player.youtube_url} />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 text-xs">
          <span className="text-ink font-semibold">
            팬 {(fanCount + (followed ? 1 : 0)).toLocaleString()}명
          </span>
          {clinicCount > 0 && <span className="text-ink-400">클리닉 {clinicCount}회 진행</span>}
          <span className="flex-1 border-t border-ink" />
        </div>
      </header>

      {/* ════════════════════════════════════════
          이하 본문
      ════════════════════════════════════════ */}
      <div className="px-5 pb-6">

        {/* ── 소개 ── */}
        {player.bio && (
          <section className="mt-8">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">ABOUT</p>
            <div className="pt-3" style={{ borderTop: '1.5px solid #111111' }}>
              <BioText text={player.bio} />
            </div>
          </section>
        )}

        {/* ── My Gear ── */}
        <section className="mt-8">
          <div className="flex items-baseline gap-2 mb-3">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">MY GEAR</p>
            <span className="text-[11px] text-ink-400">선수가 직접 사용하는 장비</span>
          </div>

          {gear.length > 0 ? (
            <div style={{ borderTop: '1.5px solid #111111' }}>
              {gear.map((g, i) => (
                <div
                  key={g.id}
                  className={`flex items-center gap-3 py-4 ${i > 0 ? 'border-t border-ink-200' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium uppercase">
                      {g.category}
                    </p>
                    <p className="text-sm font-bold text-ink truncate mt-1 tracking-tight">
                      {g.model_name}
                    </p>
                    <p className="text-xs text-ink-400 mt-0.5">{g.brand}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {g.price_krw && (
                      <p className="text-sm font-bold text-ink tabular-nums">
                        {g.price_krw.toLocaleString()}원
                      </p>
                    )}
                    <a
                      href={g.product_url ?? '#'}
                      target={g.product_url ? '_blank' : undefined}
                      rel="noreferrer"
                      onClick={!g.product_url ? (e) => e.preventDefault() : undefined}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                        g.product_url
                          ? 'bg-lime hover:bg-lime-dark text-ink pressable'
                          : 'border border-ink-200 text-ink-400 cursor-not-allowed'
                      }`}
                    >
                      동일구매
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-ink-200 p-5 text-center">
              <p className="text-ink-400 text-sm">아직 등록된 장비 정보 없음</p>
            </div>
          )}
        </section>

        {/* ── 1:1 클리닉 ── */}
        <section className="mt-8">
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">1:1 CLINIC</p>

          {clinics.length > 0 ? (
            <div style={{ borderTop: '1.5px solid #111111' }}>
              {clinics.map((clinic, i) => (
                <ClinicRow
                  key={clinic.id}
                  clinic={clinic}
                  booked={myBookings.has(clinic.id)}
                  onBook={handleBook}
                  onCancel={handleCancel}
                  first={i === 0}
                />
              ))}
            </div>
          ) : (
            <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1.5px solid #111111' }}>
              <div>
                <p className="text-ink font-bold text-sm">예정된 클리닉 없음</p>
                <button className="text-ink text-xs font-semibold mt-1 pressable">알림 받기 →</button>
              </div>
              <Calendar size={28} className="text-ink-200" />
            </div>
          )}
        </section>

        {/* ── 장비 입점 문의 — 반전 블록 ── */}
        <div className="mt-8 bg-block rounded-2xl">
          <div className="p-5">
            <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: '#D8FF3E' }}>PARTNERSHIP</p>
            <p className="text-white font-bold text-sm mt-2">장비 입점 문의</p>
            <p className="text-white/50 text-xs mt-0.5">검도 브랜드라면 누구든 환영합니다</p>
            <button
              onClick={() => setShowInquiry(true)}
              className="mt-4 bg-lime hover:bg-lime-dark text-ink text-xs font-medium px-4 py-2 rounded-full pressable"
            >
              문의하기 →
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showInquiry && <InquiryModal onClose={() => setShowInquiry(false)} />}
        </AnimatePresence>

      </div>
    </main>
  );
}
