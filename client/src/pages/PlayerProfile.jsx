import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, Share2, Heart, Search,
  Calendar, ArrowRight,
  AtSign, PlayCircle,
} from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api, authGet, authPost, authDelete } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import PlayerVideos from '../components/PlayerVideos.jsx';
import { haptic } from '../utils/haptic.js';
import { heroSrc, faceSrc } from '../utils/cloudinary.js';
import { SkeletonList } from '../components/Skeleton.jsx';
import ProfilePhotoUpload  from '../components/ProfilePhotoUpload.jsx';
import InquiryModal        from '../components/InquiryModal.jsx';
import PlayerQnA           from '../components/PlayerQnA.jsx';
import CheerCard          from '../components/CheerCard.jsx';
import TrueFansSection    from '../components/TrueFansSection.jsx';
import GradeUpModal       from '../components/GradeUpModal.jsx';
import { CHEER_ENABLED }  from '../featureFlags.js';

const LIME = '#D8FF3E';

// 저장된 인스타 값(아이디)을 링크로. 과거 URL 저장분도 그대로 지원.
function instaUrl(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://instagram.com/${s.replace(/^@/, '')}`;
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

/* ══════════════════════════════════════════════
   히어로 — 호구를 쓴 세로 사진 위에 이름을 얹는다.
   사진이 주인공이라 글씨는 라임 한 줄과 이름 하나로 줄였다.
   사진이 없는 선수가 아직 대부분이라, 없을 때도 같은 자리에
   같은 크기로 이름이 앉도록 검정 배경과 이니셜로 대체한다.
══════════════════════════════════════════════ */
function Hero({ player, children }) {
  const [loaded, setLoaded] = useState(false);
  const src = heroSrc(player.hero_image_url);
  const sub = [player.team_name, player.position].filter(Boolean).join(' · ');

  return (
    <div className="relative w-full bg-block overflow-hidden" style={{ aspectRatio: '4 / 5' }}>
      {src ? (
        <>
          {/* 사진이 뜨기 전 잠깐의 빈 화면을 덮는다 */}
          {!loaded && <div className="absolute inset-0 bg-ink-200 animate-pulse" />}
          <img
            src={src}
            alt={`${player.name} 선수`}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full border border-white/15 flex items-center justify-center">
            <span className="text-white/70 font-bold" style={{ fontSize: 44 }}>{player.name?.[0]}</span>
          </div>
        </div>
      )}

      {/* 글씨가 사진에 묻히지 않게 아래쪽만 어둡게 깐다 */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)' }}
      />

      {children}

      <div className="absolute left-5 right-5 bottom-5">
        {sub && (
          <p className="text-[11px] font-semibold tracking-[0.08em]" style={{ color: LIME }}>
            {sub}
          </p>
        )}
        <h1 className="text-white tracking-[-0.03em] leading-none mt-1.5"
            style={{ fontSize: 28, fontWeight: 800 }}>
          {player.name}
        </h1>
        {player.name_en && (
          <p className="text-white/45 text-[10px] uppercase tracking-[0.2em] mt-2">{player.name_en}</p>
        )}
      </div>
    </div>
  );
}

/* 정보 칩 — 단증 / 주특기 / 팬 수. 팬 수만 라임으로 강조한다. */
function Chip({ label, value, accent }) {
  return (
    <div className={`flex-1 min-w-0 px-3 py-2.5 text-center ${
      accent ? 'bg-lime' : 'border border-ink-200'
    }`}>
      <p className={`text-[10px] tracking-[0.14em] ${accent ? 'text-ink/55' : 'text-ink-400'}`}>{label}</p>
      <p className="text-ink font-bold text-sm mt-0.5 truncate">{value}</p>
    </div>
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
            {clinic.remaining_slots != null && (
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
  const [gradeUp,       setGradeUp]       = useState(null);   // 등급 상승 축하 모달용

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
  const fanCount     = (player.fan_count ?? 0) + (followed ? 1 : 0);
  const currentPhoto = profilePhoto ?? player.face_image_url ?? player.profile_image_url ?? null;

  /* 사진 위에 얹는 동그란 버튼 — 사진이 밝든 어둡든 보이게 흐린 검정을 깐다 */
  const heroBtn = 'w-9 h-9 flex items-center justify-center rounded-full bg-black/35 backdrop-blur-sm text-white pressable';

  return (
    <main className="page-body bg-paper min-h-screen">
      <div className="mx-auto w-full" style={{ maxWidth: 600 }}>

        {/* ════════════════════════════════════════
            1. 히어로 (사진 + 이름) — 내비도 사진 위에 얹는다
        ════════════════════════════════════════ */}
        <Hero player={player}>
          <div className="absolute left-5 right-5 top-12 flex items-center justify-between">
            <button onClick={() => navigate(-1)} className={heroBtn} aria-label="뒤로">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/search')} className={heroBtn} aria-label="선수 검색">
                <Search size={16} strokeWidth={1.8} />
              </button>
              <button className={heroBtn} aria-label="공유">
                <Share2 size={16} strokeWidth={1.8} />
              </button>
              <button
                onClick={toggleFollow}
                disabled={followLoading}
                className={`w-9 h-9 flex items-center justify-center rounded-full pressable backdrop-blur-sm ${
                  followed ? 'bg-lime text-ink' : 'bg-black/35 text-white'
                }`}
                aria-label={followed ? '팬 등록 취소' : '팬 등록'}
              >
                <Heart size={16} fill={followed ? '#111111' : 'none'} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </Hero>

        <div className="px-5 pb-6">

          {/* ════════════════════════════════════════
              2. 맨얼굴 + 스타일 — 호구를 벗은 얼굴을 한 번 보여준다
          ════════════════════════════════════════ */}
          {player.face_image_url && (
            <section className="pt-5 flex items-center gap-3.5">
              <img
                src={faceSrc(player.face_image_url)}
                alt={`${player.name} 선수 얼굴`}
                loading="lazy"
                className="flex-none object-cover bg-ink-200"
                style={{ width: 66, height: 66, borderRadius: 11 }}
              />
              <p className="text-[10px] tracking-[0.18em] text-ink-400 font-medium">호구를 벗으면</p>
            </section>
          )}

          {/* 선수 본인이면 자기 사진을 바꿀 수 있다 */}
          {isMyProfile && (
            <div className="mt-4">
              <ProfilePhotoUpload
                currentUrl={currentPhoto}
                onSuccess={(url) => setProfilePhoto(url)}
              />
            </div>
          )}

          {/* ════════════════════════════════════════
              3. 정보 칩
          ════════════════════════════════════════ */}
          <div className="flex gap-2 mt-5">
            <Chip label="단증" value={player.dan_grade ? `${player.dan_grade}단` : '—'} />
            <Chip label="주특기" value={player.specialty || player.position || '—'} />
            <Chip label="팬" value={`${fanCount.toLocaleString()}명`} accent />
          </div>

          {/* 팬 등록 + SNS */}
          <div className="flex items-center gap-3 mt-3">
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
              <SnsBtn href={instaUrl(player.instagram_url)} icon={AtSign}     disabled={!player.instagram_url} />
              <SnsBtn href={player.youtube_url}             icon={PlayCircle} disabled={!player.youtube_url} />
            </div>
          </div>

          {/* ════════════════════════════════════════
              4. 소속팀 — 단체사진은 팀 페이지에만 둔다
          ════════════════════════════════════════ */}
          {player.team_slug && (
            <Link
              to={`/teams/${player.team_slug}`}
              className="flex items-center justify-between mt-5 py-3.5 pressable"
              style={{ borderTop: '1.5px solid #111111', borderBottom: '1px solid #E5E5E5' }}
            >
              <div className="min-w-0">
                <p className="text-[10px] tracking-[0.18em] text-ink-400 font-medium">TEAM</p>
                <p className="text-ink font-bold text-sm mt-0.5 truncate">{player.team_name}</p>
              </div>
              <ArrowRight size={16} className="text-ink flex-none" />
            </Link>
          )}

          {/* ── 오늘의 응원 (보류 — featureFlags.CHEER_ENABLED) ── */}
          {CHEER_ENABLED && (
            <CheerCard
              playerId={player.id}
              playerName={player.name}
              user={user}
              onLoginRequest={onLoginRequest}
              onGradeUp={setGradeUp}
            />
          )}

          {/* ════════════════════════════════════════
              5. 하이라이트
          ════════════════════════════════════════ */}
          <PlayerVideos videos={player.videos ?? []} />

          {/* ── My Gear ── */}
          <section className="mt-8">
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">MY GEAR</p>

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

                    {g.price_krw && (
                      <p className="text-sm font-bold text-ink tabular-nums flex-shrink-0">
                        {g.price_krw.toLocaleString()}원
                      </p>
                    )}
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

          {/* ── 찐팬 명단 (보류 — featureFlags.CHEER_ENABLED) ── */}
          {CHEER_ENABLED && <TrueFansSection playerId={player.id} playerName={player.name} />}

          {/* ════════════════════════════════════════
              7. 응원 · 선수 Q&A
          ════════════════════════════════════════ */}
          <PlayerQnA
            slug={player.slug}
            playerId={player.id}
            playerName={player.name}
            onLoginRequest={onLoginRequest}
          />

          {/* ── 장비 입점 문의 — 반전 블록 ── */}
          <div className="mt-8 bg-block rounded-2xl">
            <div className="p-5">
              <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: LIME }}>PARTNERSHIP</p>
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
            {CHEER_ENABLED && gradeUp && <GradeUpModal data={gradeUp} onClose={() => setGradeUp(null)} />}
          </AnimatePresence>

        </div>
      </div>
    </main>
  );
}
