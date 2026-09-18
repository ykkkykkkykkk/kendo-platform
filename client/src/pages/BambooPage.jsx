/* 대나무 키우기 전체 화면.
 *
 * 대회가 없는 기간에 앱을 열 이유가 되는 자리다. 그래서 '오늘 뭘 하면 되는지'를
 * 대나무 바로 아래에 두고, 누르면 그 화면으로 바로 보낸다 — 할 일을 찾아다니게 하면
 * 그냥 닫는다.
 *
 * 선수 계정에는 이 기능이 없다. 주소를 직접 쳐서 들어와도 안내만 보여준다.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, Droplets, Flame, ChevronRight, Loader, Trophy, Gift,
  MessageCircle, PenLine, UserPlus, CalendarCheck, ArrowLeft,
} from 'lucide-react';
import { authGet, authPost } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import BambooPlant from '../components/BambooPlant.jsx';
import ShinaiRequestModal from '../components/ShinaiRequestModal.jsx';
import { useNotifyPrompt } from '../context/NotifyPromptContext.jsx';

const LIME = '#D8FF3E';

/* ── 진행 바 ── */
function WaterBar({ water, goal }) {
  const pct = Math.min(100, Math.round((water / goal) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-ink font-bold tabular-nums" style={{ fontSize: 17 }}>
          물 {water} <span className="text-ink-400 font-medium">/ {goal}</span>
        </p>
        <p className="text-[11px] text-ink-400">
          {water >= goal ? '다 자랐어요' : `죽도까지 ${goal - water}`}
        </p>
      </div>
      <div className="h-2.5 bg-ink-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: LIME }}
        />
      </div>
    </div>
  );
}

/* ── 오늘의 미션 한 줄 ── */
function Mission({ icon: Icon, label, sub, amount, done, highlight, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors pressable
                  ${highlight ? 'border-2' : 'border'}
                  ${done ? 'border-ink-200 bg-ink-200/15' : 'border-ink-200 hover:border-ink'}
                  disabled:cursor-default`}
      style={highlight && !done ? { borderColor: '#111' } : undefined}
    >
      <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-none
                        ${done ? 'bg-ink-200' : 'border border-ink-200'}`}>
        {done ? <Check size={14} className="text-ink-400" /> : <Icon size={14} className="text-ink" />}
      </span>

      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-medium ${done ? 'text-ink-400 line-through' : 'text-ink'}`}>
          {label}
        </span>
        {sub && <span className="block text-[11px] text-ink-400 mt-0.5">{sub}</span>}
      </span>

      <span className={`text-[11px] font-bold px-2 py-1 flex-none tabular-nums
                        ${done ? 'text-ink-400' : 'text-ink'}`}
            style={done ? undefined : { background: LIME }}>
        물 +{amount}
      </span>
      {!done && !disabled && <ChevronRight size={14} className="text-ink-400 flex-none" />}
    </button>
  );
}

export default function BambooPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { showToast } = useToast();
  const { askNotify } = useNotifyPrompt();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [watering, setWatering] = useState(false);
  const [celebrate, setCelebrate] = useState(null);   // 단계가 오른 순간
  const [formOpen, setFormOpen]   = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [codeInput, setCodeInput]   = useState('');
  const [codeBusy, setCodeBusy]     = useState(false);

  const load = useCallback(() => {
    authGet('/bamboo')
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);
  useEffect(() => { if (user) load(); else setLoading(false); }, [user, load]);

  const attend = async () => {
    if (watering) return;
    setWatering(true);
    const before = data?.stage ?? 0;
    try {
      const res = await authPost('/bamboo/attendance', {});
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error ?? '지금은 물을 줄 수 없어요.');

      showToast(d.bonus
        ? `물 +${d.amount} · ${d.streak}일 연속 보너스 +${d.bonus}!`
        : `물 +${d.amount}`, 'success');
      if (d.stage > before) setCelebrate(d.stage);
      load();
      // 내일도 물을 주려면 알림이 있어야 한다
      askNotify(1400);
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setWatering(false); }
  };

  const submitCode = async () => {
    if (codeBusy) return;
    setCodeBusy(true);
    try {
      const res = await authPost('/bamboo/invite', { code: codeInput });
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error ?? '초대 코드를 확인해주세요.');
      showToast(d.message ?? '초대 코드를 등록했어요.', 'success');
      setCodeInput('');
      load();
    } catch (e) {
      showToast(e.message, 'error');
    } finally { setCodeBusy(false); }
  };

  /* ── 로그인 안 함 ── */
  if (!user) {
    return (
      <Shell onBack={() => navigate(-1)}>
        <div className="text-center py-16">
          <BambooPlant stage={1} size={190} className="mx-auto" />
          <p className="text-ink font-bold mt-6" style={{ fontSize: 17 }}>
            대나무를 키워 죽도를 받아보세요
          </p>
          <p className="text-[13px] text-ink-400 mt-1.5">로그인하면 시작할 수 있어요.</p>
          <button onClick={() => navigate('/me')}
                  className="mt-5 px-6 py-2.5 rounded-full bg-ink text-white text-sm font-bold pressable">
            로그인하고 시작하기
          </button>
        </div>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell onBack={() => navigate(-1)}>
        <div className="flex items-center justify-center gap-2 text-ink-400 py-24">
          <Loader size={16} className="animate-spin" /> 불러오는 중…
        </div>
      </Shell>
    );
  }

  /* ── 선수 계정 ── */
  if (data && data.enabled === false) {
    return (
      <Shell onBack={() => navigate(-1)}>
        <div className="text-center py-20 px-4">
          <div className="w-14 h-14 rounded-full border border-ink-200 flex items-center justify-center mx-auto">
            <Droplets size={20} className="text-ink-400" />
          </div>
          <p className="text-ink font-bold mt-5" style={{ fontSize: 16 }}>
            {data.message ?? '대나무 키우기는 팬 회원 전용 기능입니다.'}
          </p>
          <p className="text-[13px] text-ink-400 mt-2 leading-relaxed">
            선수 계정에는 표시되지 않습니다.<br />죽도는 팬들이 모으는 상품이에요.
          </p>
          <button onClick={() => navigate('/')}
                  className="mt-6 px-6 py-2.5 rounded-full border border-ink text-ink text-sm font-bold pressable">
            홈으로
          </button>
        </div>
      </Shell>
    );
  }

  if (!data) {
    return (
      <Shell onBack={() => navigate(-1)}>
        <p className="text-ink-400 text-sm text-center py-24">불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
      </Shell>
    );
  }

  const m       = data.today?.missions ?? {};
  const pick    = m.pick;
  const inv     = data.invite;
  const notStarted = !data.started && data.water === 0;

  const statusLabel = {
    pending:  '승인 대기',
    approved: '배송 준비 중',
    shipped:  '발송 완료',
    rejected: '반려됨',
  };

  return (
    <Shell onBack={() => navigate(-1)}>
      {/* ── 대나무 ── */}
      <section className="pt-2 pb-6 flex flex-col items-center">
        <div className="relative">
          <BambooPlant stage={data.stage} size={250} />
          {celebrate !== null && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              onAnimationEnd={() => setCelebrate(null)}
              style={{ animation: 'bambooPop 1.8s ease-out forwards' }}
            >
              <span className="px-4 py-2 text-ink text-sm font-bold" style={{ background: LIME }}>
                {data.stage_name}!
              </span>
            </div>
          )}
        </div>
        <style>{`
          @keyframes bambooPop {
            0%   { opacity: 0; transform: scale(.7) translateY(10px) }
            25%  { opacity: 1; transform: scale(1)  translateY(0) }
            75%  { opacity: 1 }
            100% { opacity: 0; transform: translateY(-14px) }
          }
        `}</style>

        <span className="mt-1 text-[10px] tracking-[0.2em] text-ink-400 font-medium uppercase">
          STAGE {data.stage + 1} / 4
        </span>
        <p className="text-ink font-bold mt-1" style={{ fontSize: 19 }}>{data.stage_name}</p>

        {data.streak_days > 0 && (
          <p className="flex items-center gap-1 text-[12px] text-ink-600 mt-2">
            <Flame size={12} style={{ color: '#E2632A' }} />
            <b>{data.streak_days}일 연속</b>
            <span className="text-ink-400">
              · {data.streak_next_bonus}일 후 보너스 +{data.streak_bonus_amount}
            </span>
          </p>
        )}
      </section>

      <div className="px-1"><WaterBar water={data.water} goal={data.goal} /></div>

      {/* ── 시작 전 ── */}
      {notStarted && (
        <div className="mt-5 border border-ink-200 p-5 text-center">
          <p className="text-ink font-bold text-sm">대나무를 키워 죽도를 받아보세요</p>
          <p className="text-[12px] text-ink-400 mt-1.5 leading-relaxed">
            출석·픽·응원으로 물을 모으면 자랍니다.<br />물 {data.goal}을 채우면 죽도 한 자루를 신청할 수 있어요.
          </p>
          <button onClick={attend} disabled={watering}
                  className="mt-4 px-6 py-2.5 rounded-full bg-ink text-white text-sm font-bold pressable disabled:opacity-50">
            {watering ? '주는 중…' : '첫 물 주기'}
          </button>
        </div>
      )}

      {/* ── 오늘의 물주기 ── */}
      <section className="mt-7">
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">오늘의 물주기</p>
          <p className="text-[11px] text-ink-400">
            {data.today.remaining > 0
              ? <>오늘 받을 물 <b className="text-ink">{data.today.remaining}개</b> 남았어요</>
              : '오늘 물주기 완료 🎋'}
          </p>
        </div>

        <div className="space-y-2">
          <Mission
            icon={CalendarCheck}
            label="출석하기"
            sub={m.attendance?.done ? '오늘 완료' : '하루 한 번'}
            amount={m.attendance?.amount ?? 2}
            done={!!m.attendance?.done}
            disabled={!!m.attendance?.done || watering}
            onClick={attend}
          />

          {pick && (
            <Mission
              icon={Trophy}
              label={`${pick.tournament_name} 픽하기`}
              sub={`${pick.done}/${pick.total} 부문 완료${
                pick.done >= pick.total
                  ? ' · 전 부문 보너스 받음'
                  : ` · 전 부문 완료 시 +${pick.bonus_amount}`}`}
              amount={pick.amount ?? 1}
              done={pick.done >= pick.total}
              highlight
              onClick={() => navigate('/predictions')}
            />
          )}

          <Mission
            icon={MessageCircle}
            label="선수에게 응원 남기기"
            sub={`오늘 ${m.comment?.used ?? 0}/${m.comment?.max ?? 2}회 · 10자 이상`}
            amount={m.comment?.amount ?? 1}
            done={(m.comment?.used ?? 0) >= (m.comment?.max ?? 2)}
            onClick={() => navigate('/feed')}
          />

          <Mission
            icon={PenLine}
            label="게시판에 글 쓰기"
            sub={m.board?.done ? '오늘 완료' : '하루 한 번 · 20자 이상'}
            amount={m.board?.amount ?? 1}
            done={!!m.board?.done}
            onClick={() => navigate('/board/write')}
          />

          <Mission
            icon={UserPlus}
            label="친구 초대하기"
            sub={inv
              ? `내 코드 ${inv.code ?? '—'} · 초대 ${inv.total}명 중 ${inv.rewarded}명 지급${
                  inv.waiting ? ` · ${inv.waiting}명 대기` : ''}`
              : `초대한 친구가 ${7}일 이상 활동하면 지급`}
            amount={inv?.amount ?? 3}
            done={false}
            onClick={() => setInviteOpen(true)}
          />
        </div>
      </section>

      {/* ── 친구 초대 ── */}
      {inviteOpen && inv && (
        <section className="mt-3 border border-ink-200 p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-ink font-bold text-sm">친구 초대</p>
            <button onClick={() => setInviteOpen(false)} className="text-[11px] text-ink-400 pressable">닫기</button>
          </div>

          <p className="text-[11px] text-ink-400 mt-1.5 leading-relaxed">
            친구가 가입 후 {inv.min_days ?? 7}일 이상 활동(출석 {inv.min_attendance ?? 3}일)하면
            물 +{inv.amount}를 드려요. 한 달에 최대 {inv.monthly_max ?? 5}명까지.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <div className="flex-1 border border-ink-200 px-3 py-2.5 text-center">
              <p className="text-[10px] text-ink-400 tracking-[0.15em]">내 초대 코드</p>
              <p className="text-ink font-bold tracking-[0.2em] mt-0.5" style={{ fontSize: 18 }}>
                {inv.code ?? '—'}
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(inv.code ?? '')
                  .then(() => showToast('초대 코드를 복사했어요.', 'success'))
                  .catch(() => showToast('복사하지 못했어요. 길게 눌러 복사해주세요.', 'error'));
              }}
              className="px-4 py-3 text-xs font-bold text-ink pressable"
              style={{ background: LIME }}
            >
              복사
            </button>
          </div>

          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #E5E5E5' }}>
            <p className="text-[11px] text-ink-400 mb-1.5">
              받은 코드가 있다면 입력하세요 (가입 후 24시간 이내)
            </p>
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                className="flex-1 border border-ink-200 px-3 py-2.5 text-sm text-ink tracking-[0.2em]
                           placeholder:tracking-normal placeholder:text-ink-400/60
                           focus:outline-none focus:border-ink transition-colors"
              />
              <button
                onClick={submitCode}
                disabled={codeBusy || codeInput.length !== 6}
                className="px-4 rounded-none border border-ink text-ink text-xs font-bold pressable disabled:opacity-40"
              >
                {codeBusy ? '확인 중…' : '등록'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── 죽도 신청 ── */}
      <section className="mt-8 mb-4">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">죽도 신청</p>

        {data.request && data.request.status !== 'rejected' ? (
          <div className="bg-block p-5">
            <div className="flex items-center gap-2">
              <Gift size={15} style={{ color: LIME }} />
              <p className="text-white font-bold text-sm">{statusLabel[data.request.status]}</p>
            </div>
            <p className="text-white/55 text-[12px] mt-2">
              {data.request.size} · 신청 {String(data.request.created_at ?? '').slice(0, 10)}
            </p>
            {/* 승인 대기 → 배송 준비 중 → 발송 완료 */}
            <div className="flex items-center gap-1.5 mt-4">
              {['pending', 'approved', 'shipped'].map((s, i) => {
                const idx  = ['pending', 'approved', 'shipped'].indexOf(data.request.status);
                const on   = i <= idx;
                return (
                  <div key={s} className="flex-1 h-1 rounded-full"
                       style={{ background: on ? LIME : 'rgba(255,255,255,.18)' }} />
                );
              })}
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-white/40">
              <span>승인 대기</span><span>배송 준비</span><span>발송 완료</span>
            </div>
            {data.request.admin_note && (
              <p className="text-white/60 text-[11px] mt-3">{data.request.admin_note}</p>
            )}
          </div>
        ) : (
          <>
            {data.request?.status === 'rejected' && (
              <p className="mb-2 px-3 py-2 border border-ink-200 text-ink-600 text-[11px]">
                지난 신청은 반려되었어요.{data.request.admin_note ? ` — ${data.request.admin_note}` : ''}
              </p>
            )}
            <button
              onClick={() => setFormOpen(true)}
              disabled={data.water < data.goal}
              className="w-full py-3.5 rounded-full text-sm font-bold pressable transition-colors
                         disabled:cursor-default"
              style={data.water >= data.goal
                ? { background: LIME, color: '#111' }
                : { background: '#EDEDE8', color: '#9A9A93' }}
            >
              {data.water >= data.goal
                ? '죽도 신청하기'
                : `물 ${data.goal - data.water}개 더 모으면 신청할 수 있어요`}
            </button>
          </>
        )}

        {data.cooldown_days_left > 0 && (
          <p className="text-[11px] text-ink-400 text-center mt-3">
            죽도를 받으셨어요. {data.cooldown_days_left}일 후 다시 시작할 수 있습니다.
          </p>
        )}
      </section>

      <ShinaiRequestModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onDone={() => { setFormOpen(false); load(); }}
      />
    </Shell>
  );
}

/* 공통 껍데기 — 배경·폭·뒤로가기 */
function Shell({ children, onBack }) {
  return (
    <main className="page-body min-h-screen" style={{ background: '#F7F7F4' }}>
      <div className="mx-auto w-full" style={{ maxWidth: 600 }}>
        <header className="px-5 pt-12 pb-2 flex items-center gap-3">
          <button onClick={onBack}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable"
                  aria-label="뒤로">
            <ArrowLeft size={16} strokeWidth={1.8} />
          </button>
          <div>
            <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">GROW · BAMBOO</p>
            <h1 className="text-xl font-bold text-ink tracking-[-0.03em] leading-tight">대나무 키우기</h1>
          </div>
        </header>
        <div className="px-5 pb-10">{children}</div>
      </div>
    </main>
  );
}
