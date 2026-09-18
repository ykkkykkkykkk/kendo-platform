/* 관리자 — 죽도 신청 심사 · 어뷰징 확인.
 *
 * 죽도는 실제로 물건이 나가므로 자동 지급이 없다. 여기서 승인해야만 발송된다.
 * 승인 → 발송의 두 단계로 나눠, 승인만 하고 아직 안 보낸 것을 구분한다.
 *
 * 어뷰징 표시는 전부 '확인해 보라'는 신호일 뿐 자동 차단이 아니다.
 * 특히 같은 IP는 도장 와이파이 때문에 정상 유저도 뭉쳐 잡히므로 판단은 사람이 한다.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader, Check, X, Truck, AlertTriangle, Droplets, Settings } from 'lucide-react';
import { adminGet, adminPut } from '../../adminApi.js';

const TABS = [
  ['pending',  '승인 대기'],
  ['approved', '배송 준비'],
  ['shipped',  '발송 완료'],
  ['rejected', '반려'],
  ['all',      '전체'],
];

/** 'YYYY-MM-DD HH:MM:SS'(UTC) → 한국 시간 */
function kst(s) {
  if (!s) return '—';
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return s;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function BambooAdmin() {
  const [tab, setTab]         = useState('pending');
  const [data, setData]       = useState(null);
  const [abuse, setAbuse]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(null);
  const [err, setErr]         = useState('');
  const [notice, setNotice]   = useState('');
  const [showAbuse, setShowAbuse] = useState(false);
  const inFlight = useRef(new Set());

  const load = useCallback(async (status) => {
    setLoading(true);
    const r = await adminGet(`/shinai/requests?status=${status}`);
    setData(r ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);
  useEffect(() => { adminGet('/bamboo/abuse').then(setAbuse).catch(() => {}); }, []);

  const act = async (r, status, label) => {
    if (inFlight.current.has(r.id)) return;
    inFlight.current.add(r.id);
    try {
      let note = '';
      if (status === 'rejected') {
        note = window.prompt(`'${r.nickname}'님의 죽도 신청을 반려합니다.\n사유를 적으면 본인에게 보입니다. (선택)`) ?? '';
      } else if (!window.confirm(
        `${r.name}(${r.nickname}) · ${r.size}\n${r.address}\n\n${label}로 처리할까요?`
      )) return;

      setBusy(r.id); setErr(''); setNotice('');
      try {
        const res = await adminPut(`/shinai/requests/${r.id}`, { status, note });
        const d   = await res.json();
        if (!res.ok) {
          if (d.code === 'monthly_limit' &&
              window.confirm(`${d.error}\n\n그래도 이번 건은 승인할까요?`)) {
            const f = await adminPut(`/shinai/requests/${r.id}`, { status, note, force: true });
            const fd = await f.json();
            if (!f.ok) throw new Error(fd.error ?? '처리 실패');
          } else {
            throw new Error(d.error ?? '처리 실패');
          }
        } else if (d.already) {
          setNotice('이미 그 상태였습니다. 목록을 새로 불러왔습니다.');
        }
        await load(tab);
      } catch (e) { setErr(e.message); } finally { setBusy(null); }
    } finally { inFlight.current.delete(r.id); }
  };

  const changeLimit = async () => {
    const cur = data?.monthly?.limit ?? 10;
    const v = window.prompt(`월 지급 상한(자루). 현재 ${cur}`, String(cur));
    if (v == null) return;
    const res = await adminPut('/bamboo/settings', { key: 'monthly_shinai_limit', value: v });
    const d   = await res.json();
    if (!res.ok) { setErr(d.error ?? '변경 실패'); return; }
    setNotice(`월 지급 상한을 ${d.value}자루로 바꿨습니다.`);
    load(tab);
  };

  const list    = data?.requests ?? [];
  const monthly = data?.monthly;
  const abuseCount = abuse
    ? (abuse.short_comments?.length ?? 0) + (abuse.same_ip?.length ?? 0) +
      (abuse.fast_water?.length ?? 0) + (abuse.revoked?.length ?? 0)
    : 0;

  return (
    <div className="p-8">
      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-2xl font-bold text-ink">대나무 · 죽도</h1>
        {data?.pending_count > 0 && (
          <span className="text-xs bg-lime text-ink px-2 py-0.5 font-bold">
            승인 대기 {data.pending_count}
          </span>
        )}
      </div>
      <p className="text-ink-400 text-sm mb-4">
        물 300을 모은 회원이 죽도를 신청합니다. 자동 지급은 없고 여기서 승인해야 나갑니다.
      </p>

      {err &&    <p className="mb-3 px-3 py-2 border border-red-300 bg-red-50 text-red-700 text-[12px]">{err}</p>}
      {notice && <p className="mb-3 px-3 py-2 border border-ink-200 bg-ink-200/20 text-ink-600 text-[12px]">{notice}</p>}

      {/* 월 지급 현황 */}
      {monthly && (
        <div className="flex items-center gap-3 border border-ink-200 px-4 py-3 mb-4">
          <Droplets size={15} className="text-ink-400" />
          <p className="text-[13px] text-ink">
            {monthly.month} 지급{' '}
            <b className={monthly.over ? 'text-red-600' : 'text-ink'}>
              {monthly.issued} / {monthly.limit}
            </b>
            <span className="text-ink-400"> 자루</span>
            {monthly.over && <span className="text-red-600 text-[11px] ml-2">상한 도달 — 다음 달 대기</span>}
          </p>
          <span className="flex-1" />
          <button onClick={changeLimit}
                  className="flex items-center gap-1 text-[11px] text-ink-600 border border-ink-200 px-2.5 py-1.5 pressable hover:border-ink">
            <Settings size={11} /> 상한 변경
          </button>
        </div>
      )}

      {/* 어뷰징 의심 */}
      {abuseCount > 0 && (
        <div className="border border-amber-300 bg-amber-50 mb-4">
          <button onClick={() => setShowAbuse((v) => !v)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left pressable">
            <AlertTriangle size={15} className="text-amber-600" />
            <span className="text-[13px] text-amber-900 font-semibold">확인 필요 {abuseCount}건</span>
            <span className="flex-1" />
            <span className="text-[11px] text-amber-700">{showAbuse ? '접기' : '펼치기'}</span>
          </button>
          {showAbuse && (
            <div className="px-4 pb-4 space-y-3 text-[12px]">
              <p className="text-amber-800 text-[11px]">{abuse.note}</p>
              <AbuseList title="짧은 응원 반복 (최근 14일)" rows={abuse.short_comments}
                         render={(r) => `${r.nickname} — ${r.n}회`} />
              <AbuseList title="같은 IP에서 다수 가입" rows={abuse.same_ip}
                         render={(r) => `${r.n}명 가입 (초대자 ${r.inviters})`} />
              <AbuseList title="하루 적립 상한 초과" rows={abuse.fast_water}
                         render={(r) => `${r.nickname} — ${r.day} ${r.got}점`} />
              <AbuseList title="물 회수 반복 (쓰고 지우기)" rows={abuse.revoked}
                         render={(r) => `${r.nickname} — ${r.n}건 / ${r.points}점`} />
            </div>
          )}
        </div>
      )}

      <div className="flex mb-4">
        {TABS.map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
                  className={`px-3 py-1.5 text-[12px] border transition-colors ${
                    tab === v ? 'border-ink bg-ink text-white' : 'border-ink-200 hover:border-ink text-ink-600'
                  }`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-ink-400 py-12">
          <Loader size={16} className="animate-spin" /> 불러오는 중…
        </div>
      ) : !list.length ? (
        <p className="text-ink-400 text-sm py-10 text-center border border-ink-200">신청이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="border border-ink-200 p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">
                    {r.name}
                    <span className="text-ink-400 font-normal text-sm"> ({r.nickname})</span>
                    <span className="ml-2 bg-lime text-ink px-1.5 text-[12px]">{r.size}</span>
                  </p>
                  <p className="text-ink-600 text-[13px] mt-1.5">{r.phone}</p>
                  <p className="text-ink-600 text-[13px]">{r.address}</p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-ink-400">
                    <span>신청 {kst(r.created_at)}</span>
                    <span>물 {r.water ?? 0} · {r.cycle ?? 1}회차</span>
                    {r.streak_days > 0 && <span>연속 {r.streak_days}일</span>}
                    {r.warn_phone > 0 && (
                      <span className="text-red-600 font-medium">⚠ 같은 연락처 {r.warn_phone}건</span>
                    )}
                    {r.warn_address > 0 && (
                      <span className="text-red-600 font-medium">⚠ 같은 배송지 {r.warn_address}건</span>
                    )}
                    {r.warn_other_user && (
                      <span className="text-red-600 font-medium">⚠ 다른 계정과 겹침</span>
                    )}
                  </div>

                  {r.status !== 'pending' && (
                    <p className="text-[11px] text-ink-400 mt-1.5">
                      {{ approved: '승인', rejected: '반려', shipped: '발송' }[r.status]}{' '}
                      {kst(r.approved_at ?? r.shipped_at)}
                      {r.admin_note ? ` · ${r.admin_note}` : ''}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-none">
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => act(r, 'approved', '승인')} disabled={busy === r.id}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-ink text-white rounded-full hover:bg-ink/90 disabled:opacity-40">
                        <Check size={12} /> 승인
                      </button>
                      <button onClick={() => act(r, 'rejected', '반려')} disabled={busy === r.id}
                              className="flex items-center gap-1 text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded-full hover:bg-red-50 disabled:opacity-40">
                        <X size={12} /> 반려
                      </button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <button onClick={() => act(r, 'shipped', '발송 완료')} disabled={busy === r.id}
                            className="flex items-center gap-1 text-xs px-3 py-1.5 bg-ink text-white rounded-full hover:bg-ink/90 disabled:opacity-40">
                      <Truck size={12} /> 발송 완료
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbuseList({ title, rows, render }) {
  if (!rows?.length) return null;
  return (
    <div>
      <p className="text-amber-900 font-semibold mb-1">{title} — {rows.length}건</p>
      <div className="space-y-0.5">
        {rows.slice(0, 8).map((r, i) => (
          <p key={i} className="text-amber-800">· {render(r)}</p>
        ))}
        {rows.length > 8 && <p className="text-amber-700">… 외 {rows.length - 8}건</p>}
      </div>
    </div>
  );
}
