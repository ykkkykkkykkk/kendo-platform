import { useState, useEffect, useCallback } from 'react';
import { Loader, Check, X, Ban } from 'lucide-react';
import { adminGet, adminPost } from '../../adminApi.js';

/**
 * 도장 변경 요청 처리.
 *
 * 회원이 마이페이지에서 넣은 요청(users.dojo_change_requested_at)이 쌓이는데
 * 그동안 볼 화면이 없어 20건이 밀려 있었다. 대부분 '오타', '잘못 입력'이라
 * 방치하면 도장 관원 수와 랭킹이 계속 틀어진다.
 */
const fmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso
    : d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/** '무소속', '없음', '.' 처럼 도장을 지워달라는 요청인지 */
const wantsNone = (name) => {
  const s = (name ?? '').trim();
  return !s || ['무소속', '없음', '없슴', '.', '-', '탈퇴'].includes(s);
};

export default function DojoRequests() {
  const [list, setList]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(null);
  const [dojos, setDojos]     = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [reqs, ds] = await Promise.all([
      adminGet('/dojo-change-requests').catch(() => []),
      adminGet('/dojos').catch(() => []),
    ]);
    setList(Array.isArray(reqs) ? reqs : []);
    setDojos(Array.isArray(ds) ? ds : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* 요청한 이름이 기존 도장과 정확히 같은지 — 다르면 새 도장이 생기므로 미리 알려준다 */
  const existing = (name) => dojos.find(
    (d) => (d.name ?? '').replace(/\s/g, '') === (name ?? '').trim().replace(/\s/g, '')
  );

  const act = async (r, kind) => {
    const label = { approve: '승인', none: '무소속 처리', dismiss: '반려' }[kind];
    const msg = kind === 'approve'
      ? `'${r.nickname}' 회원을 "${r.new_dojo_name}" 도장으로 옮깁니다.` +
        (existing(r.new_dojo_name) ? '' : `\n\n⚠ 같은 이름의 도장이 없어 새로 만들어집니다.`)
      : kind === 'none'
        ? `'${r.nickname}' 회원을 소속 없음으로 바꿉니다.`
        : `'${r.nickname}' 요청을 반려합니다.\n도장은 그대로 두고 요청만 지웁니다.`;
    if (!window.confirm(msg)) return;

    setBusy(r.user_id);
    try {
      const path = kind === 'approve' ? `/users/${r.user_id}/change-dojo`
                 : kind === 'none'    ? `/users/${r.user_id}/dojo-request/none`
                 :                      `/users/${r.user_id}/dojo-request/dismiss`;
      const res = await adminPost(path, kind === 'approve' ? { new_dojo_name: r.new_dojo_name } : {});
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        alert(error ?? `${label} 실패`);
        return;
      }
      setList((prev) => prev.filter((x) => x.user_id !== r.user_id));
    } finally { setBusy(null); }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">DOJO REQUESTS</p>
        <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">도장 변경 요청</h1>
        <p className="text-ink-400 text-sm mt-1">
          대기 {list.length}건 · 회원이 마이페이지에서 넣은 요청입니다
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-ink-400 py-12">
          <Loader size={16} className="animate-spin" /> 불러오는 중…
        </div>
      ) : !list.length ? (
        <div className="border border-ink-200 p-10 text-center">
          <p className="text-ink-600 font-semibold">대기 중인 요청이 없습니다.</p>
        </div>
      ) : (
        <div className="border border-ink-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #111111' }}>
                {['회원', '현재 도장', '희망 도장', '사유', '요청 시각', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-ink-400 uppercase tracking-[0.15em] whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const none = wantsNone(r.new_dojo_name);
                const hit  = !none && existing(r.new_dojo_name);
                return (
                  <tr key={r.user_id} className="border-b border-ink-200 last:border-0 hover:bg-ink-200/20 align-top">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-ink">{r.nickname}</span>
                      <span className="text-ink-400 text-xs ml-1.5">#{r.user_id}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{r.current_dojo ?? '—'}</td>
                    <td className="px-4 py-3">
                      {none ? (
                        <span className="text-ink-400">소속 없음 요청</span>
                      ) : (
                        <>
                          <span className="font-semibold text-ink">{r.new_dojo_name}</span>
                          {!hit && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full border border-ink-200 text-ink-400 whitespace-nowrap">
                              새로 생성됨
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-600 max-w-[260px]">{r.reason || '—'}</td>
                    <td className="px-4 py-3 text-ink-400 text-xs tabular-nums whitespace-nowrap">{fmt(r.requested_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {!none && (
                          <button
                            onClick={() => act(r, 'approve')}
                            disabled={busy === r.user_id}
                            className="flex items-center gap-1 text-xs bg-lime text-ink font-medium
                                       px-2.5 py-1.5 rounded-full disabled:opacity-40"
                          >
                            <Check size={12} /> 승인
                          </button>
                        )}
                        <button
                          onClick={() => act(r, 'none')}
                          disabled={busy === r.user_id}
                          className="flex items-center gap-1 text-xs text-ink border border-ink-200
                                     hover:border-ink px-2.5 py-1.5 rounded-full disabled:opacity-40"
                        >
                          <Ban size={12} /> 소속 없음
                        </button>
                        <button
                          onClick={() => act(r, 'dismiss')}
                          disabled={busy === r.user_id}
                          className="flex items-center gap-1 text-xs text-ink-400 border border-ink-200
                                     hover:border-ink hover:text-ink px-2.5 py-1.5 rounded-full disabled:opacity-40"
                        >
                          <X size={12} /> 반려
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
