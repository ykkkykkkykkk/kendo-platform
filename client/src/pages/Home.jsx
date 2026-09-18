import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MessagesSquare, ArrowRight, Plus, TrendingUp, Minus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { faceSrc } from '../utils/cloudinary.js';
import BambooCard from '../components/BambooCard.jsx';
import WaterBadge from '../components/WaterBadge.jsx';
import WelcomeModal from '../components/WelcomeModal.jsx';
import AugustEventBanner from '../components/AugustEventBanner.jsx';
import KakaoConnectBanner from '../components/KakaoConnectBanner.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import FollowPickerModal from '../components/FollowPickerModal.jsx';
import { AnimatePresence } from 'framer-motion';

/* ══════════════════════════════════════════════════════════
   홈 = 대시보드.

   피드처럼 남의 글을 늘어놓지 않는다. 열자마자 '내 상태'와 '지금 할 일'이
   보여야 한다. 그래서 화면이 다음 순서로 고정돼 있다.
     인사 → 진행 중인 대회(제일 중요) → 내 숫자 → 응원 선수 → 최근 글

   무엇보다 **빈칸을 만들지 않는다**. 대회가 없어도, 픽을 안 했어도,
   응원하는 선수가 없어도 그 자리에는 다음에 할 행동이 들어간다.
   회색 빈 상자를 보여주느니 '뭘 하면 되는지'를 말해 주는 편이 낫다.
══════════════════════════════════════════════════════════ */

const LIME = '#D8FF3E';

/** 마감까지 남은 날. 오늘 마감이면 'D-DAY', 지났으면 null. */
function ddayOf(deadline) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days === 0) {
    const hours = Math.floor(ms / 3_600_000);
    return hours > 0 ? `${hours}시간 남음` : '곧 마감';
  }
  return `D-${days}`;
}

function Card({ children, className = '', onClick, as: As = 'div', ...rest }) {
  /* 기본은 흰 카드. 대회 카드처럼 다른 배경을 쓰는 곳이 있어서, 배경을 직접 준 경우에는
     기본값을 붙이지 않는다 — 둘 다 붙이면 Tailwind에서는 나중에 정의된 쪽이 이겨
     의도와 다른 색이 나온다(클래스를 쓴 순서로 정해지지 않는다). */
  const hasBackground = /(^|\s)bg-/.test(className);
  return (
    <As
      onClick={onClick}
      className={`${hasBackground ? '' : 'bg-white'} rounded-[15px] ${
        onClick ? 'pressable text-left w-full' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </As>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`bg-ink-200/50 animate-pulse rounded-[15px] ${className}`} />;
}

/* ── 2. 진행 중인 대회 ─────────────────────────────────
   이 화면의 목적은 픽 참여다. 그래서 이 카드만 검정으로 깔아 제일 먼저 눈에 들어오게 한다.
   대회가 없을 때도 카드는 남는다 — 대신 지난 대회 결과로 보낸다. */
function TournamentCard({ data, user, onLoginRequest }) {
  const navigate = useNavigate();
  const t = data?.tournament;

  if (!t) {
    const recent = data?.recent_tournament;
    return (
      <Card className="bg-block p-5">
        <p className="text-[11px] tracking-[0.16em] font-semibold" style={{ color: LIME }}>
          진행 중인 대회
        </p>
        <p className="text-white font-bold mt-2.5" style={{ fontSize: 16 }}>
          다음 대회를 준비 중이에요
        </p>
        <p className="text-white/50 text-[13px] mt-1">
          픽이 열리면 여기에 가장 먼저 올라옵니다.
        </p>
        <button
          onClick={() => navigate(recent ? `/predictions/${recent.id}` : '/predictions')}
          className="flex items-center gap-1 text-[13px] font-semibold mt-4 pressable"
          style={{ color: LIME }}
        >
          {recent ? `${recent.name} 결과 보기` : '지난 대회 보기'} <ArrowRight size={13} />
        </button>
      </Card>
    );
  }

  const dday   = ddayOf(t.deadline);
  const picked = !!data.my_picked;

  return (
    <Card className="bg-block p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] tracking-[0.16em] font-semibold" style={{ color: LIME }}>
          진행 중인 대회
        </p>
        {dday && (
          <span className="text-white/70 text-[11px] font-semibold tabular-nums">{dday}</span>
        )}
      </div>

      <p className="text-white font-bold mt-2.5 leading-snug" style={{ fontSize: 16 }}>
        {t.name}
      </p>
      <p className="text-white/50 text-[13px] mt-1">
        {picked
          ? '픽을 마쳤어요. 마감 전까지 바꿀 수 있습니다.'
          : t.has_team_division
            ? '단체전 우승팀을 맞혀보세요'
            : '우승자를 맞혀보세요'}
      </p>

      <button
        onClick={() => (user ? navigate(`/predictions/${t.id}`) : onLoginRequest?.())}
        className="w-full mt-4 py-3 rounded-full text-ink text-sm font-bold pressable"
        style={{ background: LIME }}
      >
        {picked ? '내 픽 확인하기' : '픽하러 가기'}
      </button>
    </Card>
  );
}

/* ── 3. 내 숫자 ────────────────────────────────────────
   점수와 도장 순위. 아직 픽을 한 번도 안 했어도 0점이 뜬다 —
   숫자가 있으면 화면이 비어 보이지 않고, 0은 그 자체로 유도가 된다. */
function MyNumbers({ data, onLoginRequest }) {
  const navigate = useNavigate();
  const score = data?.score;
  const dojo  = data?.dojo;

  return (
    <div className="flex gap-3">
      <Card className="flex-1 p-4">
        <p className="text-[11px] text-ink-400">내 점수</p>
        <p className="text-ink font-bold tabular-nums mt-1" style={{ fontSize: 22 }}>
          {(score?.total ?? 0).toLocaleString()}
          <span className="text-[13px] font-semibold text-ink-400 ml-0.5">점</span>
        </p>
        {score?.week > 0 ? (
          <p className="flex items-center gap-1 text-[11px] font-semibold mt-1 text-emerald-600">
            <TrendingUp size={11} /> 이번 주 +{score.week}
          </p>
        ) : (
          <p className="flex items-center gap-1 text-[11px] text-ink-400 mt-1">
            <Minus size={11} /> 이번 주 변화 없음
          </p>
        )}
      </Card>

      {dojo ? (
        <Card as="button" onClick={() => navigate('/ranking')} className="flex-1 p-4">
          <p className="text-[11px] text-ink-400 truncate">{dojo.name}</p>
          {dojo.rank ? (
            <>
              <p className="text-ink font-bold tabular-nums mt-1" style={{ fontSize: 22 }}>
                {dojo.rank}
                <span className="text-[13px] font-semibold text-ink-400 ml-0.5">위</span>
              </p>
              <p className="text-[11px] text-ink-400 mt-1 tabular-nums">
                {dojo.member_count}명 · {dojo.total_score.toLocaleString()}점
              </p>
            </>
          ) : (
            <>
              <p className="text-ink font-bold mt-1" style={{ fontSize: 15 }}>순위 밖</p>
              <p className="text-[11px] text-ink-400 mt-1">
                5명부터 순위에 올라요 (현재 {dojo.member_count}명)
              </p>
            </>
          )}
        </Card>
      ) : (
        /* 도장을 등록하지 않은 사람에게 회색 빈칸 대신 다음 행동을 준다 */
        <Card as="button" onClick={() => navigate('/me')} className="flex-1 p-4">
          <p className="text-[11px] text-ink-400">우리 도장</p>
          <p className="text-ink font-bold mt-1" style={{ fontSize: 15 }}>도장 등록하기</p>
          <p className="text-[11px] text-ink-400 mt-1">등록하면 도장 순위에 점수가 쌓여요</p>
        </Card>
      )}
    </div>
  );
}

/* ── 4. 내가 응원하는 선수 ─────────────────────────── */
function Follows({ data, onOpenPicker }) {
  const navigate = useNavigate();
  const follows  = data?.follows ?? [];
  const suggested = data?.suggested ?? [];

  const avatar = (p, size = 56) => {
    const src = p.face_image_url ?? p.profile_image_url;
    return src
      ? <img src={faceSrc(src, 160)} alt="" className="w-full h-full object-cover" />
      : (
        <span className="w-full h-full flex items-center justify-center text-white font-bold"
              style={{ background: p.color_primary ?? '#111111', fontSize: size * 0.34 }}>
          {p.name?.[0]}
        </span>
      );
  };

  if (!follows.length) {
    return (
      <Card className="p-4">
        <p className="text-ink font-bold text-sm">응원할 선수를 찾아보세요</p>
        <p className="text-[12px] text-ink-400 mt-0.5">
          응원하면 그 선수의 소식이 알림으로 옵니다.
        </p>
        <div className="flex gap-2 mt-3">
          {suggested.map((p) => (
            <button key={p.id} onClick={() => navigate(`/players/${p.slug}`)}
                    className="flex-1 min-w-0 pressable">
              <span className="block w-14 h-14 rounded-full overflow-hidden mx-auto bg-ink-200">
                {avatar(p, 56)}
              </span>
              <span className="block text-[12px] font-semibold text-ink mt-1.5 truncate">{p.name}</span>
              <span className="block text-[11px] text-ink-400 truncate">{p.team_name}</span>
            </button>
          ))}
          {!suggested.length && (
            <button onClick={onOpenPicker}
                    className="w-full py-2.5 rounded-full bg-ink text-white text-sm font-medium pressable">
              선수 찾아보기
            </button>
          )}
        </div>
        {suggested.length > 0 && (
          <button onClick={onOpenPicker}
                  className="w-full mt-3 py-2.5 rounded-full bg-ink text-white text-sm font-medium pressable">
            선수 명단에서 고르기
          </button>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-ink font-bold text-sm">내가 응원하는 선수</p>
        <span className="text-[11px] text-ink-400 tabular-nums">{follows.length}명</span>
      </div>
      <div className="flex gap-3 scroll-x mt-3 -mx-4 px-4">
        {follows.map((p) => (
          <button key={p.id} onClick={() => navigate(`/players/${p.slug}`)}
                  className="flex-none w-[60px] pressable">
            <span className="block w-14 h-14 rounded-full overflow-hidden mx-auto bg-ink-200">
              {avatar(p)}
            </span>
            <span className="block text-[11px] text-ink-600 mt-1.5 truncate text-center">{p.name}</span>
          </button>
        ))}
        {/* 더 찾기 — 점선 원으로 '아직 빈 자리'라는 걸 보여준다 */}
        <button onClick={onOpenPicker} className="flex-none w-[60px] pressable">
          <span className="w-14 h-14 rounded-full border border-dashed border-ink-200 flex items-center justify-center mx-auto">
            <Plus size={18} className="text-ink-400" />
          </span>
          <span className="block text-[11px] text-ink-400 mt-1.5 text-center">더 찾기</span>
        </button>
      </div>
    </Card>
  );
}

export default function Home({ onLoginRequest }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showWelcome, setShowWelcome] = useState(
    () => !localStorage.getItem('welcome_seen') && !localStorage.getItem('kendo_token')
  );
  const closeWelcome = () => {
    localStorage.setItem('welcome_seen', 'true');
    setShowWelcome(false);
  };
  const startWelcome = () => { closeWelcome(); onLoginRequest?.(); };

  // 홈에 필요한 값은 한 번에 받는다 (서버에서 묶어 준다)
  const { data, loading, refetch } = useFetch(api.homeSummary, [user?.id]);

  // 응원할 선수 고르기 — 가입할 때 보던 그 명단을 그대로 연다
  const [pickerOpen, setPickerOpen] = useState(false);
  const closePicker = () => { setPickerOpen(false); refetch(); };

  const news = data?.news ?? [];
  // 픽을 받는 대회가 있는지 — 홈 카드 순서가 이걸로 갈린다
  const hasTournament = !!data?.tournament;

  return (
    <main className="page-body min-h-screen" style={{ background: '#F7F7F4' }}>
      <WelcomeModal open={showWelcome} onClose={closeWelcome} onStart={startWelcome} />

      <div className="mx-auto w-full" style={{ maxWidth: 600 }}>
        {/* ── 상단 바 ── */}
        <header className="px-5 pt-12">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">SEASON 26 — KUMDO</p>
              <h1 className="text-2xl font-bold text-ink tracking-[-0.04em] leading-tight mt-0.5 whitespace-nowrap">
                MINOR—STAR<span className="align-super text-[10px] font-medium">®</span>
              </h1>
            </div>
            <div className="flex items-center gap-1 pt-1">
              <button onClick={() => navigate('/board')}
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable"
                      aria-label="자유게시판">
                <MessagesSquare size={16} strokeWidth={1.8} />
              </button>
              <WaterBadge />
              <NotificationBell />
              <button onClick={() => navigate('/search')}
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable"
                      aria-label="선수 검색">
                <Search size={16} strokeWidth={1.8} />
              </button>
              <button onClick={() => (user ? navigate('/me') : onLoginRequest?.())}
                      className="w-9 h-9 rounded-full border border-ink flex items-center justify-center pressable"
                      aria-label="마이페이지">
                <span className="text-ink text-xs font-bold">{user?.nickname?.[0] ?? 'M'}</span>
              </button>
            </div>
          </div>
        </header>

        <AugustEventBanner onLoginRequest={onLoginRequest} />
        <KakaoConnectBanner />

        <div className="px-5 pt-6 pb-6 space-y-3">

          {/* ── 1. 인사말 ── */}
          <div className="pb-1">
            {user ? (
              <>
                <p className="text-[13px] text-ink-400">안녕하세요, {user.nickname}님</p>
                <p className="text-ink font-bold mt-0.5" style={{ fontSize: 19 }}>
                  오늘도 한 판 하실까요?
                </p>
              </>
            ) : (
              <>
                <p className="text-ink font-bold" style={{ fontSize: 19 }}>
                  검도, 이제 예측하고 응원하세요
                </p>
                <p className="text-[13px] text-ink-400 mt-1">
                  우승자를 맞히고 도장 순위를 올려보세요.
                </p>
                <button
                  onClick={() => onLoginRequest?.()}
                  className="mt-3 px-5 py-2.5 rounded-full bg-ink text-white text-sm font-bold pressable"
                >
                  시작하기
                </button>
              </>
            )}
          </div>

          {/* ── 2·3. 대회와 대나무 ──
              대회가 열려 있으면 픽이 먼저다(제일 크게). 대회가 없는 공백기에는
              대나무가 이 화면의 주인공이 되고, '다음 대회 준비 중' 안내는 그 아래로 내려간다. */}
          {loading ? (
            <Skeleton className="h-[182px]" />
          ) : hasTournament ? (
            <>
              <TournamentCard data={data} user={user} onLoginRequest={onLoginRequest} />
              <BambooCard />
            </>
          ) : (
            <>
              <BambooCard big />
              <TournamentCard data={data} user={user} onLoginRequest={onLoginRequest} />
            </>
          )}

          {/* ── 4·5. 로그인한 사람에게만 '내 것'을 보여준다 ── */}
          {user && (loading
            ? <><Skeleton className="h-[92px]" /><Skeleton className="h-[124px]" /></>
            : <><MyNumbers data={data} /><Follows data={data} onOpenPicker={() => setPickerOpen(true)} /></>)}

          {/* ── 5. 최근 소식 — 없으면 이 자리는 아예 비운다 ── */}
          {news.length > 0 && (
            <Card className="p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-ink font-bold text-sm">최근 소식</p>
                <Link to="/board" className="text-[11px] text-ink-400 pressable">전체보기</Link>
              </div>
              <div className="mt-1">
                {news.map((n, i) => (
                  <Link key={n.id} to={`/board/${n.id}`}
                        className={`flex items-center gap-2 py-2.5 pressable ${
                          i > 0 ? 'border-t border-ink-200/70' : ''
                        }`}>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] text-ink truncate">{n.title}</span>
                      <span className="block text-[11px] text-ink-400 truncate">
                        {n.nickname}
                        {n.comment_count > 0 && ` · 댓글 ${n.comment_count}`}
                      </span>
                    </span>
                    <ArrowRight size={13} className="text-ink-400 flex-none" />
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* 비로그인에게는 '내 것' 자리에 무엇이 생기는지 보여준다 */}
          {!user && !loading && (
            <Card className="p-4">
              <p className="text-ink font-bold text-sm">로그인하면 보이는 것</p>
              <div className="mt-2.5 space-y-1.5">
                {['내 픽 점수와 이번 주 변화', '우리 도장 순위', '응원하는 선수 소식'].map((t) => (
                  <p key={t} className="flex items-center gap-2 text-[13px] text-ink-600">
                    <span className="w-1 h-1 rounded-full bg-ink flex-none" />
                    {t}
                  </p>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <FollowPickerModal
            open
            onClose={closePicker}
            followedIds={(data?.follows ?? []).map((p) => p.id)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
