import { useState, useEffect, useCallback } from 'react';
import { Loader, Check, X, Heart } from 'lucide-react';
import { adminGet, adminPost } from '../../adminApi.js';

const TABS = [['pending', '확인 대기'], ['approved', '승인됨'], ['rejected', '거절됨'], ['all', '전체']];

/** 'YYYY-MM-DD HH:MM:SS'(UTC) → 한국 시간 */
function kst(s) {
  if (!s) return '—';
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return s;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 선수 본인 신청 심사.
 *
 * 승인하면 그 회원이 선수 계정으로 바뀐다(role=player + 선수 연결).
 * 팬으로 쓰던 사람이면 팔로우·픽이 그대로 남은 채 전환된다.
 */
export default function PlayerClaims() {
  const [tab, setTab]       = useState('pending');
  const [claims, setClaims] = useState([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]     = useState(null);
  const [err, setErr]       = useState('');

  const load = useCallback(async (status) => {
    setLoading(true);
    const r = await adminGet(`/player-claims?status=${status}`);
    setClaims(Array.isArray(r?.claims) ? r.claims : []);
    setPending(r?.pending_count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  const act = async (c, kind) => {
    const label = kind === 'approve' ? '승인' : '거절';
    const note = kind === 'reject'
      ? window.prompt(`'${c.nickname}'님의 ${c.player_name} 신청을 거절합니다.\n사유를 적으면 본인에게 보입니다. (선택)`) ?? ''
      : '';
    if (kind === 'approve' && !window.confirm(
      `'${c.nickname}'님을 ${c.player_name}(${c.team_name ?? '팀 없음'}) 선수 계정으로 전환할까요?\n` +
      `이 회원의 팔로우 ${c.follow_count}건·픽 ${c.pick_count}건은 그대로 유지됩니다.`
    )) return;

    setBusy(c.id); setErr('');
    try {
      const res  = await adminPost(`/player-claims/${c.id}/${kind}`, { note });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `${label} 실패`);
      await load(tab);
    } catch (e) { setErr(e.message); } finally { setBusy(null); }
  };

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-2xl font-bold text-ink">선수 신청</h1>
        {pending > 0 && (
          <span className="text-xs bg-lime text-ink px-2 py-0.5 font-bold">확인 대기 {pending}</span>
        )}
      </div>
      <p className="text-ink-400 text-sm mb-4">
        본인이 선수라고 신청한 목록입니다. 승인하면 선수 계정으로 바뀌고, 팔로우·픽은 그대로 유지됩니다.
      </p>

      {err && <p className="mb-4 px-3 py-2 border border-red-300 bg-red-50 text-red-700 text-[12px]">{err}</p>}

      <div className="flex mb-4">
        {TABS.map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`px-3 py-1.5 text-[12px] border transition-colors ${
              tab === v ? 'border-ink bg-ink text-white' : 'border-ink-200 hover:border-ink text-ink-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-ink-400 py-12">
          <Loader size={16} className="animate-spin" /> 불러오는 중…
        </div>
      ) : !claims.length ? (
        <p className="text-ink-400 text-sm py-10 text-center border border-ink-200">신청이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {claims.map((c) => (
            <div key={c.id} className="border border-ink-200 p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">
                    {c.nickname}
                    <span className="text-ink-400 font-normal"> → </span>
                    <span className="bg-lime text-ink px-1.5">{c.player_name}</span>
                    <span className="text-ink-400 text-sm font-normal">
                      {' '}{c.team_name ?? '팀 없음'}{c.dan_grade ? ` · ${c.dan_grade}단` : ''}
                    </span>
                  </p>
                  {c.note && <p className="text-ink-600 text-sm mt-1.5">“{c.note}”</p>}

                  {/* 판단 근거 — 본인 여부를 가늠할 재료를 한 줄로 모은다 */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-ink-400">
                    <span>신청 {kst(c.created_at)}</span>
                    <span>가입 {String(c.user_created_at ?? '').slice(0, 10)}</span>
                    <span>팔로우 {c.follow_count} · 픽 {c.pick_count}</span>
                    {c.kakao_id && <span className="text-ink-600">카카오 연결됨</span>}
                    {c.username && <span className="font-mono">{c.username}</span>}
                    {!!c.follows_target && (
                      <span className="flex items-center gap-0.5 text-ink font-medium">
                        <Heart size={10} /> 본인 프로필 팬 등록함
                      </span>
                    )}
                    {!!c.player_taken && (
                      <span className="text-red-600 font-medium">⚠ 이미 다른 계정이 연결됨</span>
                    )}
                  </div>

                  {c.status !== 'pending' && (
                    <p className="text-[11px] text-ink-400 mt-1.5">
                      {c.status === 'approved' ? '승인' : '거절'} {kst(c.reviewed_at)}
                      {c.review_note ? ` · ${c.review_note}` : ''}
                    </p>
                  )}
                </div>

                {c.status === 'pending' && (
                  <div className="flex gap-2 flex-none">
                    <button
                      onClick={() => act(c, 'approve')}
                      disabled={busy === c.id}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 bg-ink text-white
                                 rounded-full hover:bg-ink/90 disabled:opacity-40 transition-colors"
                    >
                      <Check size={12} /> 승인
                    </button>
                    <button
                      onClick={() => act(c, 'reject')}
                      disabled={busy === c.id}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 text-red-600 border
                                 border-red-200 rounded-full hover:bg-red-50 disabled:opacity-40 transition-colors"
                    >
                      <X size={12} /> 거절
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
