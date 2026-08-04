import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

/**
 * 카카오 로그인.
 *
 * 닉네임+휴대폰 끝 4자리 방식은 본인 확인이 안 돼 같은 사람이 계정을 몇 개든 만들 수 있었다.
 * 카카오는 회원 고유번호를 주므로 한 사람당 계정 하나로 묶인다.
 *
 * 화면 흐름
 *   start  카카오로 시작하기
 *   choice 처음 보는 카카오 계정 → 새로 시작할지, 쓰던 계정에 붙일지 고른다
 *   link   쓰던 닉네임 + 끝 4자리를 넣어 예전 계정을 넘겨받는다
 *   player 관리자에게 아이디를 미리 받은 선수가 그 계정에 카카오를 붙인다
 *   newPlayer 아이디를 받은 적 없는 선수 — 팀·이름만 고르면 가입과 동시에 승인 신청이 들어간다
 */
export const KAKAO_REDIRECT_URI = `${window.location.origin}/oauth/kakao`;
export const RETURN_KEY = 'kakao_return_to';

export default function KakaoLoginModal({ onClose, resumeCode = null }) {
  const { login } = useAuth();
  const [step,    setStep]    = useState('start');
  const [token,   setToken]   = useState(null);   // 서버가 준 표(ticket). 다음 단계에서 신원 증명에 쓴다
  const [kakaoNick, setKNick] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone,   setPhone]   = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  /* 선수 가입(newPlayer)용 — 팀을 고르면 그 팀 선수만 보여준다.
     카카오로 신원이 잡히므로 아이디·비밀번호는 받지 않는다. */
  const [roster,   setRoster]   = useState(null);   // null = 아직 못 불러옴
  const [teamPick, setTeamPick] = useState('');
  const [mePick,   setMePick]   = useState(null);
  const [note,     setNote]     = useState('');

  /* 가입 직후 팬 등록(follow) 단계.
     가입만 하고 아무것도 안 하는 사람이 절반을 넘어, 처음에 선수 3명을 고르게 한다.
     여기서 고른 선수는 그대로 팬으로 쌓인다(= 선수 프로필의 팬 수). */
  const FOLLOW_TARGET = 3;
  const [fanPicks, setFanPicks] = useState([]);
  const [fanQuery, setFanQuery] = useState('');

  useEffect(() => { if (step === 'choice') setNickname(kakaoNick); }, [step, kakaoNick]);

  useEffect(() => {
    if ((step !== 'newPlayer' && step !== 'follow') || roster) return;
    api.players()
      .then((r) => setRoster(Array.isArray(r) ? r : (r?.players ?? [])))
      .catch(() => setError('선수 명단을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'));
  }, [step, roster]);

  // 팀 목록은 명단에서 뽑는다 (팀이 없는 선수는 제외)
  const teamNames = [...new Set((roster ?? []).map((p) => p.team_name).filter(Boolean))].sort();
  const teamRoster = (roster ?? [])
    .filter((p) => p.team_name === teamPick)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  /* 팬 등록 후보: 검색어가 있으면 이름·팀으로 찾고, 없으면 팬이 많은 선수부터 보여준다.
     처음 온 사람은 누굴 골라야 할지 모르므로 빈 화면 대신 인기순을 깔아준다. */
  const fanTerm = fanQuery.trim().replace(/\s/g, '');
  const fanCandidates = (roster ?? [])
    .filter((p) => !fanTerm
      || p.name?.replace(/\s/g, '').includes(fanTerm)
      || p.team_name?.replace(/\s/g, '').includes(fanTerm))
    .sort((a, b) => (b.fan_count ?? 0) - (a.fan_count ?? 0))
    .slice(0, 40);
  const toggleFan = (p) =>
    setFanPicks((prev) => prev.some((x) => x.id === p.id)
      ? prev.filter((x) => x.id !== p.id)
      : [...prev, p]);

  const post = async (path, body) => {
    const res  = await fetch(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? '요청에 실패했습니다.');
    return data;
  };

  const done = (data) => { login(data.token); onClose(); };

  /* SDK v2에는 팝업 로그인(Auth.login)이 없다. authorize()로 카카오에 다녀오면
     redirectUri에 ?code=... 를 달고 돌아오고, 그 코드를 서버가 토큰으로 바꾼다. */
  const startKakao = () => {
    if (!window.Kakao?.isInitialized?.()) {
      setError('카카오 로그인이 아직 준비되지 않았습니다.\n잠시 후 다시 시도해주세요.');
      return;
    }
    setLoading(true); setError(null);
    // 로그인 마치고 보던 화면으로 돌려보내려고 남겨둔다
    sessionStorage.setItem(RETURN_KEY, window.location.pathname + window.location.search);
    window.Kakao.Auth.authorize({ redirectUri: KAKAO_REDIRECT_URI, scope: 'profile_nickname' });
  };

  /* 카카오에서 돌아왔을 때(=code를 들고 열렸을 때) 이어서 처리한다.
     KakaoCallback이 코드를 넘겨주면 그때부터 '선택' 단계로 들어간다. */
  useEffect(() => {
    if (!resumeCode) return;
    setLoading(true);
    (async () => {
      try {
        const data = await post('kakao/code', { code: resumeCode, redirectUri: KAKAO_REDIRECT_URI });
        if (data.needs_choice) {           // 처음 오신 분 — 새로 만들지 물어본다
          setKNick(data.kakao_nickname ?? '');
          setToken(data.ticket);           // 다음 단계에서 신원을 증명할 표
          setStep('choice');
        } else {
          done(data);                       // 이미 연결된 계정 — 바로 입장
        }
      } catch (e) { setError(e.message); } finally { setLoading(false); }
    })();
  }, [resumeCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const signup = async () => {
    if (!nickname.trim()) { setError('닉네임을 입력해주세요.'); return; }
    setLoading(true); setError(null);
    try {
      const data = await post('kakao/signup', { ticket: token, nickname: nickname.trim() });
      login(data.token);          // 팬 등록에 토큰이 필요하니 먼저 로그인시킨다
      setLoading(false);
      setStep('follow');          // 바로 닫지 않고 선수 3명 고르는 화면으로
    } catch (e) { setError(e.message); setLoading(false); }
  };

  /* 고른 선수를 팬으로 등록한다. 하나쯤 실패해도 가입 자체는 이미 끝났으므로 막지 않는다. */
  const submitFans = async () => {
    setLoading(true); setError(null);
    for (const p of fanPicks) {
      try { await api.follow(p.id); } catch { /* 개별 실패는 넘어간다 */ }
    }
    onClose();
  };

  const linkPlayer = async () => {
    if (!username.trim() || !password) { setError('아이디와 비밀번호를 입력해주세요.'); return; }
    setLoading(true); setError(null);
    try { done(await post('kakao/link', { ticket: token, username: username.trim(), password })); }
    catch (e) { setError(e.message); setLoading(false); }
  };

  /* 아이디 없는 선수의 가입.
     계정을 먼저 만들고(=승인 전까지는 일반 회원) 곧바로 승인 신청을 넣는다.
     관리자가 어드민에서 확인하고 승인하면 그때 선수 계정이 된다. */
  const signupAsPlayer = async () => {
    if (!mePick) { setError('소속팀과 본인 이름을 골라주세요.'); return; }
    setLoading(true); setError(null);
    let joined = false;
    try {
      const data = await post('kakao/signup', { ticket: token, nickname: mePick.name.slice(0, 10) });
      login(data.token);                      // 다음 요청에 토큰이 실리도록 먼저 저장한다
      joined = true;

      const res  = await api.claimPlayer({ player_id: mePick.id, note: note.trim() });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? '선수 신청에 실패했습니다.');
      setLoading(false);
      setStep('follow');          // 선수도 마찬가지로 좋아하는 선수를 고르게 한다
    } catch (e) {
      // 가입은 됐는데 신청만 실패한 경우를 구분해준다 (다시 가입할 필요는 없다)
      setError(joined
        ? `가입은 완료됐습니다.\n다만 선수 신청이 되지 않았습니다: ${e.message}\n마이페이지에서 다시 신청해주세요.`
        : e.message);
      setLoading(false);
    }
  };

  const linkOld = async () => {
    if (!/^\d{4}$/.test(phone)) { setError('휴대폰 끝 4자리를 숫자로 입력해주세요.'); return; }
    setLoading(true); setError(null);
    try { done(await post('kakao/link', { ticket: token, nickname: nickname.trim(), phone })); }
    catch (e) { setError(e.message); setLoading(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 z-[90] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-mobile bg-paper rounded-t-2xl px-6 pt-5 pb-10"
        style={{ borderTop: '1.5px solid #111111' }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-label="카카오 로그인"
      >
        <div className="flex justify-end">
          <button onClick={onClose} aria-label="닫기" className="text-ink-400 pressable"><X size={18} /></button>
        </div>

        <div className="text-center mb-5 -mt-2">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 overflow-hidden">
            <img src="/logo.svg" alt="마이너스타" className="w-full h-full" />
          </div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-1">MINOR—STAR®</p>
          <h2 className="text-ink font-bold text-lg tracking-tight">
            {step === 'link'      && '쓰던 계정 가져오기'}
            {step === 'player'    && '선수 계정 연결'}
            {step === 'newPlayer' && '선수 등록 신청'}
            {step === 'follow'    && '좋아하는 선수 고르기'}
            {(step === 'start' || step === 'choice') && '마이너스타 시작하기'}
          </h2>
          <p className="text-ink-400 text-sm mt-1">
            {step === 'start'     && '카카오로 3초면 시작해요'}
            {step === 'choice'    && '처음이신가요?'}
            {step === 'link'      && '전에 쓰시던 닉네임과 번호를 넣어주세요'}
            {step === 'player'    && '선수용 아이디와 비밀번호를 넣어주세요'}
            {step === 'newPlayer' && '소속팀과 본인 이름만 골라주세요'}
            {step === 'follow'    && `${FOLLOW_TARGET}명만 고르면 준비 끝이에요`}
          </p>
        </div>

        {error && <p className="text-red-600 text-xs text-center mb-3 whitespace-pre-line">{error}</p>}

        {step === 'start' && (
          <button
            onClick={startKakao}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 bg-[#FEE500] text-[#3C1E1E]
                       font-bold py-3.5 rounded-xl text-sm pressable disabled:opacity-60"
          >
            {loading ? '연결 중…' : <><KakaoIcon /> 카카오로 시작하기</>}
          </button>
        )}

        {step === 'choice' && (
          <>
            <label className="text-xs font-medium text-ink-600 mb-1 block">닉네임</label>
            <input
              type="text" maxLength={10} value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full border border-ink-200 px-4 py-3 rounded-xl text-sm text-ink
                         outline-none focus:border-ink mb-3"
            />
            <button
              onClick={signup}
              disabled={loading}
              className="w-full bg-lime hover:bg-lime-dark text-ink font-bold py-3.5 rounded-full
                         text-sm pressable disabled:opacity-50"
            >
              {loading ? '만드는 중…' : '새로 시작하기'}
            </button>
            <button
              onClick={() => { setError(null); setPhone(''); setStep('link'); }}
              className="w-full mt-2.5 text-ink-600 text-sm py-2 underline"
            >
              전에 쓰던 계정이 있어요
            </button>
            <button
              onClick={() => { setError(null); setTeamPick(''); setMePick(null); setNote(''); setStep('newPlayer'); }}
              className="w-full mt-2.5 border border-ink text-ink font-bold py-3.5 rounded-full
                         text-sm pressable"
            >
              저는 선수입니다
            </button>
            <button
              onClick={() => { setError(null); setPassword(''); setStep('player'); }}
              className="w-full mt-2.5 text-ink-600 text-sm py-2 underline"
            >
              선수 계정이 있어요
            </button>
          </>
        )}

        {step === 'follow' && (
          <>
            <div className="flex items-center gap-2 border border-ink-200 px-3 py-2.5 rounded-xl mb-2">
              <Search size={15} className="text-ink-400 flex-none" />
              <input
                value={fanQuery}
                onChange={(e) => setFanQuery(e.target.value)}
                placeholder="선수 이름 또는 소속팀"
                className="flex-1 text-sm text-ink outline-none bg-transparent placeholder:text-ink-400/60"
              />
            </div>

            <div className="border border-ink-200 rounded-xl max-h-56 overflow-y-auto mb-3">
              {!roster && <p className="text-ink-400 text-[12px] px-4 py-3">명단 불러오는 중…</p>}
              {fanCandidates.map((p) => {
                const on = fanPicks.some((x) => x.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleFan(p)}
                    className={`w-full text-left px-4 py-2.5 border-b border-ink-200 last:border-0
                                flex items-center gap-2 ${on ? 'bg-lime' : 'hover:bg-ink-200/20'}`}
                  >
                    {on && <Check size={14} className="flex-none" />}
                    <span className="text-sm text-ink font-medium">{p.name}</span>
                    <span className="text-[11px] text-ink-400 truncate">{p.team_name}</span>
                    {p.fan_count > 0 && (
                      <span className="ml-auto text-[11px] text-ink-400 tabular-nums flex-none">
                        팬 {p.fan_count}
                      </span>
                    )}
                  </button>
                );
              })}
              {roster && !fanCandidates.length && (
                <p className="text-ink-400 text-[12px] px-4 py-3">찾는 선수가 없습니다.</p>
              )}
            </div>

            <button
              onClick={submitFans}
              disabled={fanPicks.length < FOLLOW_TARGET || loading}
              className="w-full bg-lime hover:bg-lime-dark text-ink font-bold py-3.5 rounded-full
                         text-sm pressable disabled:opacity-40"
            >
              {loading
                ? '등록 중…'
                : fanPicks.length < FOLLOW_TARGET
                  ? `${FOLLOW_TARGET - fanPicks.length}명 더 골라주세요`
                  : `${fanPicks.length}명 팬 등록하고 시작하기`}
            </button>
            <p className="text-ink-400 text-[11px] text-center mt-2.5 leading-[1.5]">
              고른 선수의 소식과 경기 결과를 먼저 받아볼 수 있어요.<br />
              나중에 마이페이지에서 언제든 바꿀 수 있습니다.
            </p>
            <button
              onClick={onClose}
              className="w-full mt-2 text-ink-400 text-xs py-2"
            >
              나중에 할게요
            </button>
          </>
        )}

        {step === 'newPlayer' && (
          <>
            <label className="text-xs font-medium text-ink-600 mb-1 block">소속팀</label>
            <select
              value={teamPick}
              onChange={(e) => { setTeamPick(e.target.value); setMePick(null); }}
              disabled={!roster}
              className="w-full border border-ink-200 px-4 py-3 rounded-xl text-sm text-ink
                         outline-none focus:border-ink mb-3 bg-transparent disabled:opacity-50"
            >
              <option value="">{roster ? '팀을 골라주세요' : '명단 불러오는 중…'}</option>
              {teamNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>

            {teamPick && (
              <>
                <label className="text-xs font-medium text-ink-600 mb-1 block">본인 이름</label>
                <div className="border border-ink-200 rounded-xl max-h-44 overflow-y-auto mb-3">
                  {teamRoster.map((p) => {
                    const on = mePick?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setMePick(on ? null : p)}
                        className={`w-full text-left px-4 py-2.5 border-b border-ink-200 last:border-0
                                    flex items-center gap-2 ${on ? 'bg-lime' : 'hover:bg-ink-200/20'}`}
                      >
                        {on && <Check size={14} className="flex-none" />}
                        <span className="text-sm text-ink font-medium">{p.name}</span>
                        {p.dan_grade ? <span className="text-[11px] text-ink-400">{p.dan_grade}단</span> : null}
                      </button>
                    );
                  })}
                  {!teamRoster.length && (
                    <p className="text-ink-400 text-[12px] px-4 py-3">이 팀에 등록된 선수가 없습니다.</p>
                  )}
                </div>
                {/* 명단은 기존 선수 DB라서 신규 선수는 아직 없을 수 있다 */}
                <p className="text-ink-400 text-[11px] -mt-1 mb-3 leading-[1.5]">
                  본인 이름이 없나요? 아직 명단에 없는 선수일 수 있습니다.
                  일단 <span className="text-ink-600">새로 시작하기</span>로 가입하신 뒤 운영자에게 알려주세요.
                </p>
              </>
            )}

            <label className="text-xs font-medium text-ink-600 mb-1 block">
              본인 확인에 도움이 될 내용 <span className="text-ink-400/60">(선택)</span>
            </label>
            <textarea
              rows={2} maxLength={200} value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: 8월 대회 5단부 출전, 인스타 @아이디"
              className="w-full border border-ink-200 px-3 py-2.5 rounded-xl text-sm text-ink
                         outline-none focus:border-ink mb-3 placeholder:text-ink-400/60 resize-none"
            />

            <button
              onClick={signupAsPlayer}
              disabled={!mePick || loading}
              className="w-full bg-lime hover:bg-lime-dark text-ink font-bold py-3.5 rounded-full
                         text-sm pressable disabled:opacity-40"
            >
              {loading ? '신청 중…' : '가입하고 선수 신청'}
            </button>
            <p className="text-ink-400 text-[11px] text-center mt-2.5 leading-[1.5]">
              카카오로 확인되니 아이디·비밀번호는 없어도 됩니다.<br />
              운영자가 본인 확인 후 선수 계정으로 바꿔드립니다.
            </p>
            <button
              onClick={() => { setError(null); setStep('choice'); }}
              className="w-full mt-2 text-ink-400 text-xs py-2"
            >
              뒤로
            </button>
          </>
        )}

        {step === 'player' && (
          <>
            <label className="text-xs font-medium text-ink-600 mb-1 block">선수용 아이디</label>
            <input
              type="text" autoCapitalize="none" autoCorrect="off" value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="관리자에게 받은 아이디"
              className="w-full border border-ink-200 px-4 py-3 rounded-xl text-sm text-ink
                         outline-none focus:border-ink mb-3 placeholder:text-ink-400/60"
            />
            <label className="text-xs font-medium text-ink-600 mb-1 block">비밀번호</label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') linkPlayer(); }}
              className="w-full border border-ink-200 px-4 py-3 rounded-xl text-sm text-ink
                         outline-none focus:border-ink mb-3"
            />
            <button
              onClick={linkPlayer}
              disabled={loading}
              className="w-full bg-lime hover:bg-lime-dark text-ink font-bold py-3.5 rounded-full
                         text-sm pressable disabled:opacity-50"
            >
              {loading ? '연결 중…' : '선수 계정 연결'}
            </button>
            <p className="text-ink-400 text-[11px] text-center mt-2.5 leading-[1.5]">
              연결하면 다음부터 카카오로 바로 들어옵니다.<br />
              아이디로 로그인하는 방법도 그대로 쓸 수 있어요.
            </p>
            <button
              onClick={() => { setError(null); setStep('choice'); }}
              className="w-full mt-2 text-ink-400 text-xs py-2"
            >
              뒤로
            </button>
          </>
        )}

        {step === 'link' && (
          <>
            <label className="text-xs font-medium text-ink-600 mb-1 block">쓰시던 닉네임</label>
            <input
              type="text" maxLength={10} value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예전에 쓰던 닉네임"
              className="w-full border border-ink-200 px-4 py-3 rounded-xl text-sm text-ink
                         outline-none focus:border-ink mb-3 placeholder:text-ink-400/60"
            />
            <label className="text-xs font-medium text-ink-600 mb-1 block">휴대폰 끝 4자리</label>
            <input
              type="tel" inputMode="numeric" maxLength={4} value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') linkOld(); }}
              placeholder="0000"
              className="w-full border border-ink-200 px-4 py-3 rounded-xl text-sm text-ink
                         outline-none focus:border-ink mb-3 placeholder:text-ink-400/60"
            />
            <button
              onClick={linkOld}
              disabled={loading}
              className="w-full bg-lime hover:bg-lime-dark text-ink font-bold py-3.5 rounded-full
                         text-sm pressable disabled:opacity-50"
            >
              {loading ? '연결 중…' : '내 계정 가져오기'}
            </button>
            <p className="text-ink-400 text-[11px] text-center mt-2.5 leading-[1.5]">
              연결하면 예전 픽·팔로우가 그대로 따라옵니다.<br />
              다음부터는 카카오로만 들어오시면 됩니다.
            </p>
            <button
              onClick={() => { setError(null); setStep('choice'); }}
              className="w-full mt-2 text-ink-400 text-xs py-2"
            >
              뒤로
            </button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M9 1C4.58 1 1 3.91 1 7.5c0 2.3 1.48 4.32 3.72 5.5L3.9 16.1a.3.3 0 00.45.32L8.1 14.1c.29.03.59.04.9.04 4.42 0 8-2.91 8-6.5S13.42 1 9 1z"
        fill="#3C1E1E"/>
    </svg>
  );
}
