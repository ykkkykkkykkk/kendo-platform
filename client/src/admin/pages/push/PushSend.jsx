import { useState, useEffect } from 'react';
import { Bell, Send, AlertTriangle } from 'lucide-react';
import { adminGet, adminPost } from '../../adminApi.js';

/**
 * 어드민 푸시 발송.
 *
 * 이벤트 알림(질문·댓글)은 자동으로 나가지만 대회 공지·대진표 발표처럼
 * 사람이 판단해서 쏘는 알림은 보낼 자리가 없었다.
 *
 * 전체 발송은 취소가 안 된다. 그래서 보내기 전에 대상 수를 반드시 한 번 보여주고,
 * 확인 모달을 거치게 한다.
 */

const TARGETS = [
  { v: 'all',              label: '전체 회원' },
  { v: 'fans',             label: '팬 회원' },
  { v: 'players',          label: '선수 계정' },
  { v: 'player_followers', label: '특정 선수 팬' },
  { v: 'user',             label: '회원 1명 (테스트)' },
];

const STATUS = {
  sending: { label: '발송중', cls: 'border border-ink-200 text-ink-600' },
  done:    { label: '완료',   cls: 'bg-lime text-ink' },
  error:   { label: '실패',   cls: 'bg-red-100 text-red-700' },
};

export default function PushSend() {
  const [stats,   setStats]   = useState(null);
  const [history, setHistory] = useState([]);
  const [players, setPlayers] = useState([]);

  const [title,     setTitle]     = useState('');
  const [body,      setBody]      = useState('');
  const [link,      setLink]      = useState('/');
  const [target,    setTarget]    = useState('all');
  const [playerId,  setPlayerId]  = useState('');
  const [userId,    setUserId]    = useState('');
  const [saveInbox, setSaveInbox] = useState(true);

  // 회원 1명(테스트)용 — 회원 번호는 어디에도 안 보이므로 닉네임으로 찾아 고른다
  const [userQuery,   setUserQuery]   = useState('');
  const [userResults, setUserResults] = useState([]);
  const [picked,      setPicked]      = useState(null);

  const [confirm, setConfirm] = useState(null);   // { label, userCount, deviceCount }
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState(null);   // { type: 'ok' | 'err', text }

  /* 조회가 실패하면(429·500) 이전 목록을 그대로 둔다.
     빈 배열로 덮으면 방금 보낸 게 안 보여 '발송이 안 됐나' 싶어진다. */
  const loadHistory = () =>
    adminGet('/push/broadcasts?limit=15')
      .then((d) => { if (Array.isArray(d)) setHistory(d); })
      .catch(() => {});

  useEffect(() => {
    adminGet('/push/stats').then(setStats).catch(() => {});
    loadHistory();
  }, []);

  // 선수 목록은 수백 명이라 필요할 때만 불러온다
  useEffect(() => {
    if (target !== 'player_followers' || players.length) return;
    adminGet('/players')
      .then((d) => setPlayers(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [target]);

  /* 타이핑마다 부르면 관리자 API 한도(1분 120회)를 혼자 다 먹는다. 멈춘 뒤에만 찾는다. */
  useEffect(() => {
    const q = userQuery.trim();
    if (target !== 'user' || picked || !q) { setUserResults([]); return; }
    const t = setTimeout(() => {
      adminGet(`/push/user-search?q=${encodeURIComponent(q)}`)
        .then((d) => setUserResults(Array.isArray(d) ? d : []))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [userQuery, target, picked]);

  const query = () => {
    const p = new URLSearchParams({ target });
    if (target === 'player_followers') p.set('playerId', playerId);
    if (target === 'user')             p.set('userId', userId);
    return p.toString();
  };

  /* 보내기 전에 대상 수를 확인한다 — 여기서 틀린 대상을 걸러낸다 */
  const openConfirm = async () => {
    setMsg(null);
    if (!title.trim() || !body.trim()) {
      setMsg({ type: 'err', text: '제목과 내용을 모두 입력해주세요.' });
      return;
    }
    if (target === 'user' && !userId) {
      setMsg({ type: 'err', text: '보낼 회원을 찾아 선택해주세요.' });
      return;
    }
    setBusy(true);
    try {
      const d = await adminGet(`/push/estimate?${query()}`);
      if (d?.error) setMsg({ type: 'err', text: d.error });
      else if (!d.deviceCount && !saveInbox)
        setMsg({ type: 'err', text: '대상 중 알림을 켠 기기가 없습니다. (알림함 저장을 켜면 앱 안에는 남길 수 있습니다)' });
      else setConfirm(d);
    } catch {
      setMsg({ type: 'err', text: '대상을 확인하지 못했습니다.' });
    }
    setBusy(false);
  };

  const send = async () => {
    setBusy(true);
    try {
      const res = await adminPost('/push/send', {
        title: title.trim(),
        body:  body.trim(),
        link:  link.trim() || '/',
        target,
        playerId: playerId || undefined,
        userId:   userId   || undefined,
        saveInbox,
      });
      const d = await res.json();
      if (!res.ok) {
        setMsg({ type: 'err', text: d?.error ?? '발송에 실패했습니다.' });
      } else {
        setMsg({ type: 'ok', text: `${d.label} · 기기 ${d.deviceCount}대로 발송을 시작했습니다.` });
        /* 보낸 건 바로 이력에 얹는다. 다시 불러오는 요청 하나가 실패해도
           (관리자 API 한도에 걸리면 429가 난다) 방금 보낸 게 안 보이는 일은 없어야 한다.
           성공·실패 숫자는 잠시 뒤 새로고침이 채운다. */
        setHistory((h) => [{
          id: d.id, title: title.trim(), body: body.trim(), link: link.trim() || '/',
          target_label: d.label, user_count: d.userCount, device_count: d.deviceCount,
          sent: 0, failed: 0, removed: 0, save_inbox: saveInbox ? 1 : 0, status: 'sending',
          created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        }, ...h]);
        setTitle(''); setBody(''); setLink('/');
      }
      // 발송은 백그라운드에서 끝난다. 결과가 이력에 적힐 때쯤 한 번만 불러온다
      // (관리자 API는 1분 120회를 화면 전체가 나눠 쓰므로 헛조회를 만들지 않는다).
      setTimeout(loadHistory, 3000);
    } catch {
      setMsg({ type: 'err', text: '발송에 실패했습니다.' });
    }
    setConfirm(null);
    setBusy(false);
  };

  const input = 'w-full border border-ink-200 px-4 py-2.5 text-sm text-ink placeholder:text-ink-400/60 focus:outline-none focus:border-ink transition-colors';

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">PUSH</p>
        <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">푸시 발송</h1>
      </div>

      {/* 알림을 켠 사람이 몇이나 되는지 — 여기가 0이면 무엇을 보내도 아무에게도 안 뜬다 */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            ['알림 켠 기기', stats.devices],
            ['알림 켠 회원', stats.users],
            ['전체 회원',    stats.members],
            ['선수 계정',    stats.players],
          ].map(([label, n]) => (
            <div key={label} className="border border-ink-200 px-4 py-3">
              <p className="text-[11px] text-ink-400">{label}</p>
              <p className="text-2xl font-bold text-ink tabular-nums mt-0.5">{n ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {stats?.devices === 0 && (
        <div className="flex gap-2 border border-ink-200 bg-ink-200/20 px-4 py-3 mb-6">
          <AlertTriangle size={16} className="flex-none mt-0.5 text-ink-600" />
          <p className="text-sm text-ink-600">
            알림을 켠 기기가 아직 없습니다. 앱(홈 화면 추가/설치)에서 마이페이지 → 알림을 켜야 발송 대상이 생깁니다.
          </p>
        </div>
      )}

      {/* 작성 */}
      <div className="border border-ink-200 p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-600 mb-1 block">
            제목 <span className="text-ink-400">({title.length}/40)</span>
          </label>
          <input className={input} value={title} maxLength={40}
                 onChange={(e) => setTitle(e.target.value)}
                 placeholder="예: 대통령기 대진표 공개" />
        </div>

        <div>
          <label className="text-xs font-medium text-ink-600 mb-1 block">
            내용 <span className="text-ink-400">({body.length}/120)</span>
          </label>
          <textarea rows={3} className={`${input} resize-none`} value={body} maxLength={120}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="예: 남녀 개인전·단체전 대진표가 올라왔어요. 지금 확인해보세요." />
        </div>

        <div>
          <label className="text-xs font-medium text-ink-600 mb-1 block">누르면 갈 곳</label>
          <input className={input} value={link} onChange={(e) => setLink(e.target.value)}
                 placeholder="/draw" />
          <p className="text-[11px] text-ink-400 mt-1">앱 안 주소만 됩니다 (/ 로 시작). 예: /draw, /feed, /rank</p>
        </div>

        <div>
          <label className="text-xs font-medium text-ink-600 mb-1 block">대상</label>
          <div className="flex flex-wrap gap-2">
            {TARGETS.map(({ v, label }) => (
              <button key={v} type="button" onClick={() => setTarget(v)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  target === v ? 'bg-ink text-white' : 'text-ink-600 border border-ink-200 hover:border-ink'
                }`}>{label}</button>
            ))}
          </div>
        </div>

        {target === 'player_followers' && (
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">선수</label>
            <select className={input} value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="">선수를 선택하세요</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.team_name})</option>
              ))}
            </select>
          </div>
        )}

        {target === 'user' && (
          <div>
            <label className="text-xs font-medium text-ink-600 mb-1 block">회원 찾기</label>
            <input className={input} value={userQuery} onChange={(e) => setUserQuery(e.target.value)}
                   placeholder="닉네임 또는 아이디" />
            <p className="text-[11px] text-ink-400 mt-1">전체 발송 전에 본인 계정으로 먼저 쏴보는 용도입니다.</p>

            {picked && (
              <div className="flex items-center gap-2 mt-2 border border-ink px-3 py-2">
                <span className="text-sm font-semibold text-ink">{picked.nickname}</span>
                <span className="text-xs text-ink-400">
                  {picked.devices > 0 ? `알림 켠 기기 ${picked.devices}대` : '알림 안 켬 — 잠금화면에는 안 뜹니다'}
                </span>
                <button type="button" onClick={() => { setPicked(null); setUserId(''); }}
                        className="ml-auto text-ink-400 hover:text-ink text-sm">✕</button>
              </div>
            )}

            {!picked && userResults.length > 0 && (
              <div className="border border-ink-200 mt-2 max-h-52 overflow-auto">
                {userResults.map((u) => (
                  <button key={u.id} type="button"
                    onClick={() => { setPicked(u); setUserId(String(u.id)); setUserResults([]); }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 border-b border-ink-200
                               last:border-0 hover:bg-ink-200/30 transition-colors">
                    <span className="text-sm font-medium text-ink">{u.nickname}</span>
                    <span className="text-xs text-ink-400">
                      {u.role === 'player' ? '선수' : (u.dojo_name ?? u.home_dojo ?? '')}
                    </span>
                    <span className={`ml-auto text-xs ${u.devices > 0 ? 'text-ink' : 'text-ink-400'}`}>
                      {u.devices > 0 ? `기기 ${u.devices}대` : '알림 안 켬'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!picked && userQuery.trim() && userResults.length === 0 && (
              <p className="text-[11px] text-ink-400 mt-2">찾는 회원이 없습니다.</p>
            )}
          </div>
        )}

        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={saveInbox} className="mt-0.5"
                 onChange={(e) => setSaveInbox(e.target.checked)} />
          <span className="text-sm text-ink-600">
            앱 안 알림함에도 남기기
            <span className="block text-[11px] text-ink-400">
              끄면 잠금화면에만 잠깐 뜨고 사라집니다. 알림을 켜지 않은 회원은 알림함으로만 볼 수 있습니다.
            </span>
          </span>
        </label>

        {/* 미리보기 — 잠금화면에서 어떻게 잘리는지 확인 */}
        <div>
          <p className="text-xs font-medium text-ink-600 mb-1">미리보기</p>
          <div className="flex gap-3 items-start bg-ink-200/30 border border-ink-200 px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-ink flex items-center justify-center flex-none">
              <Bell size={16} className="text-lime" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{title || '마이너스타'}</p>
              <p className="text-sm text-ink-600 line-clamp-2">{body || '내용이 여기 보입니다'}</p>
            </div>
          </div>
        </div>

        {msg && (
          <p className={`text-sm ${msg.type === 'ok' ? 'text-ink' : 'text-red-600'}`}>{msg.text}</p>
        )}

        <button onClick={openConfirm} disabled={busy}
          className="flex items-center justify-center gap-2 w-full py-3 bg-ink text-white font-medium rounded-full text-sm transition-opacity disabled:opacity-50">
          <Send size={15} />
          {busy ? '확인 중...' : '대상 확인하고 보내기'}
        </button>
      </div>

      {/* 이력 */}
      <div className="mt-8">
        <h2 className="font-bold text-ink mb-3">발송 이력</h2>
        {history.length === 0 ? (
          <p className="text-ink-400 text-sm">아직 보낸 알림이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {history.map((b) => {
              const st = STATUS[b.status] ?? STATUS.sending;
              return (
                <div key={b.id} className="border border-ink-200 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        <span className="text-xs text-ink-600">{b.target_label}</span>
                      </div>
                      <p className="font-semibold text-sm text-ink mt-1">{b.title}</p>
                      <p className="text-ink-600 text-sm line-clamp-1">{b.body}</p>
                      <p className="text-[11px] text-ink-400 mt-1 tabular-nums">
                        회원 {b.user_count} · 기기 {b.device_count} · 성공 {b.sent}
                        {b.failed > 0 && ` · 실패 ${b.failed}`}
                        {b.removed > 0 && ` · 해지 ${b.removed}`}
                        {b.save_inbox ? ' · 알림함 저장' : ''}
                      </p>
                      {b.error && <p className="text-[11px] text-red-600 mt-0.5">{b.error}</p>}
                    </div>
                    <p className="text-ink-400 text-xs flex-none tabular-nums">{b.created_at?.slice(5, 16)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 확인 — 보낸 알림은 되돌릴 수 없다 */}
      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-paper border border-ink w-full max-w-sm p-6">
            <h3 className="font-bold text-lg text-ink mb-3">이대로 보낼까요?</h3>
            <div className="border border-ink-200 p-4 mb-4 space-y-1">
              <p className="text-sm text-ink"><span className="text-ink-400">대상</span> {confirm.label}</p>
              <p className="text-sm text-ink tabular-nums">
                <span className="text-ink-400">회원</span> {confirm.userCount}명 ·{' '}
                <span className="text-ink-400">알림 켠 기기</span> {confirm.deviceCount}대
              </p>
            </div>
            <p className="text-[11px] text-ink-400 mb-4">
              보낸 알림은 취소할 수 없습니다. 잠금화면에 뜨는 건 알림을 켠 {confirm.deviceCount}대입니다.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)} disabled={busy}
                className="flex-1 py-2.5 text-ink border border-ink-200 hover:border-ink font-medium rounded-full text-sm transition-colors disabled:opacity-50">
                취소
              </button>
              <button onClick={send} disabled={busy}
                className="flex-1 py-2.5 bg-ink text-white font-medium rounded-full text-sm disabled:opacity-50">
                {busy ? '보내는 중...' : '발송'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
