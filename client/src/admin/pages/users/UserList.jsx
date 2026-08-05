import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader, Search, Trash2, X } from 'lucide-react';
import { adminGet, adminDelete } from '../../adminApi.js';

/**
 * 'YYYY-MM-DD HH:MM:SS'(UTC) → 'YYYY-MM-DD HH:MM' 한국 시간.
 * SQLite datetime('now')는 UTC라 Z를 붙여 해석해야 9시간 어긋나지 않는다.
 */
function seenAt(s) {
  const d = new Date(String(s).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return s;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* 검색어가 걸린 부분을 라임으로 칠한다.
   '검도인'처럼 도장 이름이면서 닉네임이기도 한 말이 있어, 표시가 없으면
   이 행이 도장 때문에 나온 건지 닉네임 때문인지 구분이 안 된다. */
function Hit({ text, term }) {
  const s = text ?? '';
  if (!term) return <>{s}</>;
  const i = s.replace(/\s/g, '').indexOf(term);
  if (i < 0) return <>{s}</>;
  // 공백을 뺀 기준으로 찾았으므로 원문에서의 위치를 다시 잡는다
  let seen = 0, start = -1, end = -1;
  for (let k = 0; k < s.length; k++) {
    if (/\s/.test(s[k])) continue;
    if (seen === i) start = k;
    if (seen === i + term.length - 1) { end = k + 1; break; }
    seen++;
  }
  if (start < 0 || end < 0) return <>{s}</>;
  return (
    <>
      {s.slice(0, start)}
      <mark className="bg-lime text-ink px-0.5">{s.slice(start, end)}</mark>
      {s.slice(end)}
    </>
  );
}

/** 가입 회원 관리. 선수 계정(role=player)은 '선수 계정' 메뉴에서 따로 다룬다. */
export default function UserList() {
  const [users, setUsers]     = useState([]);
  const [seedCount, setSeed]  = useState(0);
  const [showSeed, setShow]   = useState(false);   // 가라팬은 기본 숨김
  const [kakao,    setKakao]  = useState('');     // '' | 'linked' | 'unlinked'
  const [kstat,    setKstat]  = useState(null);   // 카카오 전환 진행 상황
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');
  const [field, setField]     = useState('all');   // 'all' | 'dojo' | 'nickname'
  const [detail, setDetail]   = useState(null);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState('');

  /* 검색 결과에 걸린 도장별 인원. 검색어가 비었으면 세지 않는다(전체 목록엔 의미 없음). */
  const dojoCounts = useMemo(() => {
    const term = q.trim().replace(/\s/g, '');
    if (!term) return [];
    const tally = new Map();
    for (const u of users) {
      const name = u.dojo_name ?? u.home_dojo;
      if (!name) continue;
      if (!name.replace(/\s/g, '').includes(term)) continue;   // 도장 이름이 검색어와 맞는 경우만
      tally.set(name, (tally.get(name) ?? 0) + 1);
    }
    return [...tally.entries()]
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n);
  }, [users, q]);

  // 화면에 칠할 검색어 (지금 목록을 만든 검색어)
  const term = q.trim().replace(/\s/g, '');

  // 닉네임 때문에 걸린 건수. '검도인'처럼 도장이면서 닉네임인 말이 있어 따로 센다.
  const nickHits = useMemo(
    () => (term ? users.filter((u) => (u.nickname ?? '').replace(/\s/g, '').includes(term)).length : 0),
    [users, term],
  );

  const load = useCallback(async (query = '', withSeed = false, kakaoFilter = '', scope = 'all') => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query)   params.set('q', query);
    if (withSeed) params.set('include_seed', '1');
    if (kakaoFilter) params.set('kakao', kakaoFilter);
    if (scope !== 'all') params.set('field', scope);
    const r = await adminGet(`/users${params.toString() ? `?${params}` : ''}`);
    setUsers(Array.isArray(r?.users) ? r.users : []);
    setSeed(r?.seed_count ?? 0);
    setKstat(r?.kakao ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(q, showSeed, kakao, field); /* eslint-disable-next-line */ }, [showSeed, kakao, field]);

  async function openDetail(id) {
    setDetail({ loading: true });
    const d = await adminGet(`/users/${id}`);
    setDetail(d);
  }

  async function remove(u) {
    if (!window.confirm(
      `'${u.nickname}' 회원을 삭제할까요?\n이 회원의 팔로우 ${u.follow_count}건, 픽 ${u.pick_count}건도 함께 지워집니다.\n되돌릴 수 없습니다.`
    )) return;
    setBusy(true); setErr('');
    try {
      const res = await adminDelete(`/users/${u.id}`);
      if (!res.ok) throw new Error((await res.json()).error ?? '삭제 실패');
      setDetail(null);
      await load(q, showSeed, kakao, field);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-2xl font-bold text-ink">회원 관리</h1>
        <span className="text-sm text-ink-400">{users.length}명</span>
        {busy && <Loader size={14} className="animate-spin text-ink-400" />}
      </div>
      <p className="text-ink-400 text-sm mb-4">가입한 회원 목록입니다. 닉네임·도장으로 검색할 수 있습니다.</p>

      {err && <p className="mb-4 px-3 py-2 border border-red-300 bg-red-50 text-red-700 text-[12px]">{err}</p>}

      {/* 가라팬(팔로워 수 채우기용 시드 계정)은 실제 가입자가 아니라 기본으로 숨긴다 */}
      {seedCount > 0 && (
        <div className="flex items-center gap-2 mb-4 text-[12px]">
          <span className="text-ink-400">
            {showSeed ? `가라팬 ${seedCount}명 포함해서 보는 중` : `가라팬 ${seedCount}명 숨김`}
          </span>
          <button
            onClick={() => setShow((v) => !v)}
            className="px-2.5 py-1 border border-ink-200 hover:border-ink text-ink-600 transition-colors"
          >
            {showSeed ? '숨기기' : '가라팬 보기'}
          </button>
        </div>
      )}

      {/* 카카오 전환 진행 상황. 누가 아직 연결 안 했는지 골라볼 수 있다 */}
      {kstat && (
        <div className="flex items-center gap-2 mb-4 text-[12px] flex-wrap">
          <span className="text-ink-400">
            카카오 연결 <span className="text-ink font-semibold">{kstat.linked}</span>
            {' / '}{kstat.total}명
            {kstat.total > 0 && (
              <span className="text-ink-400"> ({Math.round((kstat.linked / kstat.total) * 100)}%)</span>
            )}
          </span>
          <div className="flex">
            {[['', '전체'], ['linked', '연결됨'], ['unlinked', '미연결']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setKakao(v)}
                className={`px-2.5 py-1 border transition-colors ${
                  kakao === v ? 'border-ink bg-ink text-white' : 'border-ink-200 hover:border-ink text-ink-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); load(q, showSeed, kakao, field); }}
        className="flex items-center gap-2 mb-4 max-w-xl"
      >
        {/* 검색 범위 — '검도인'처럼 도장이면서 닉네임인 말이 있어 골라서 찾는다 */}
        <div className="flex flex-none">
          {[['all', '전체'], ['dojo', '도장'], ['nickname', '닉네임']].map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setField(v)}
              className={`px-2.5 py-2 text-[12px] border transition-colors ${
                field === v ? 'border-ink bg-ink text-white' : 'border-ink-200 hover:border-ink text-ink-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex items-center gap-2 border border-ink-200 px-3 py-2">
          <Search size={14} className="text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={field === 'dojo' ? '도장 이름' : field === 'nickname' ? '닉네임' : '닉네임 · 도장 · 아이디'}
            className="flex-1 text-sm outline-none bg-transparent"
          />
          {q && (
            <button type="button" onClick={() => { setQ(''); load('', showSeed, kakao, field); }} className="text-ink-400">
              <X size={14} />
            </button>
          )}
        </div>
        <button type="submit" className="px-4 py-2 bg-ink text-white text-sm font-medium">검색</button>
      </form>

      {/* 도장으로 검색했으면 그 도장 소속이 몇 명인지 바로 보여준다.
          이름이 겹쳐 여러 도장이 걸릴 수 있으므로 도장별로 나눠 센다. */}
      {(dojoCounts.length > 0 || nickHits > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {dojoCounts.map(({ name, n }) => (
            <span key={name} className="inline-flex items-baseline gap-1.5 border border-ink px-3 py-1.5 text-sm">
              <span className="font-semibold text-ink">{name}</span>
              <span className="text-ink-400 text-xs">소속</span>
              <span className="font-bold text-ink tabular-nums">{n}명</span>
            </span>
          ))}
          {nickHits > 0 && (
            <span className="inline-flex items-baseline gap-1.5 border border-ink-200 px-3 py-1.5 text-sm">
              <span className="text-ink-400 text-xs">닉네임에 포함</span>
              <span className="font-bold text-ink tabular-nums">{nickHits}명</span>
            </span>
          )}
          {!showSeed && seedCount > 0 && (
            <span className="text-[11px] text-ink-400 self-center">가라팬 제외</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-ink-400 py-12"><Loader size={16} className="animate-spin" /> 불러오는 중…</div>
      ) : (
        <div className="border border-ink-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-[11px] tracking-wider text-ink-400">
                <th className="px-4 py-3 font-medium">닉네임</th>
                <th className="px-4 py-3 font-medium">도장</th>
                <th className="px-4 py-3 font-medium">단</th>
                <th className="px-4 py-3 font-medium">응원팀</th>
                <th className="px-4 py-3 font-medium">팔로우</th>
                <th className="px-4 py-3 font-medium">픽</th>
                <th className="px-4 py-3 font-medium">마지막 접속</th>
                <th className="px-4 py-3 font-medium">카카오</th>
                <th className="px-4 py-3 font-medium">접속 IP</th>
                <th className="px-4 py-3 font-medium">가입일</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-ink-200 last:border-0 hover:bg-ink-200/20">
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(u.id)} className="font-semibold text-ink hover:underline">
                      <Hit text={u.nickname} term={term} />
                    </button>
                    {u.role !== 'fan' && (
                      <span className="ml-1.5 text-[10px] bg-lime text-ink px-1.5 py-0.5 font-bold">
                        {u.role === 'player'
                          ? (u.player_name ? `선수·${u.player_name}` : '선수·연결필요')
                          : u.role}
                      </span>
                    )}
                    {u.username && (
                      <span className="ml-1.5 text-[10px] text-ink-400 font-mono">{u.username}</span>
                    )}
                    {!!u.is_seed && (
                      <span className="ml-1.5 text-[10px] border border-ink-200 text-ink-400 px-1.5 py-0.5">
                        가라팬
                      </span>
                    )}
                  </td>
                  {/* 도장을 누르면 그 도장 관원만 걸러 본다 */}
                  <td className="px-4 py-3 text-ink-600">
                    {u.dojo_name ?? u.home_dojo ? (
                      <button
                        onClick={() => {
                          const name = u.dojo_name ?? u.home_dojo;
                          setQ(name);
                          setField('dojo');
                          load(name, showSeed, kakao, 'dojo');
                        }}
                        title={`${u.dojo_name ?? u.home_dojo} 관원 보기`}
                        className="underline decoration-ink-200 underline-offset-2 hover:text-ink hover:decoration-ink"
                      >
                        <Hit text={u.dojo_name ?? u.home_dojo} term={term} />
                      </button>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{u.dan_grade ? `${u.dan_grade}단` : '—'}</td>
                  <td className="px-4 py-3 text-ink-600">{u.favorite_team ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{u.follow_count}</td>
                  <td className="px-4 py-3 text-ink-600 tabular-nums">{u.pick_count}</td>
                  <td className="px-4 py-3 text-xs tabular-nums whitespace-nowrap">
                    {u.last_seen_at
                      ? <span className="text-ink">{seenAt(u.last_seen_at)}</span>
                      : <span className="text-ink-400">기록 없음</span>}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {u.kakao_id
                      ? <span className="text-[10px] bg-[#FEE500] text-[#3C1E1E] px-1.5 py-0.5 font-bold">연결됨</span>
                      : <span className="text-ink-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {u.last_ip ? (
                      <>
                        <span className="font-mono text-ink-600">{u.last_ip}</span>
                        {/* 같은 IP를 쓰는 계정이 있으면 중복 가입일 수 있다 (가족·도장 공용일 수도 있음) */}
                        {u.same_ip_count > 0 && (
                          <span
                            title="같은 IP를 쓰는 다른 계정이 있습니다. 닉네임을 눌러 확인하세요."
                            className="ml-1.5 text-[10px] bg-lime text-ink px-1.5 py-0.5 font-bold"
                          >
                            +{u.same_ip_count}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-ink-400">기록 없음</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-400 text-xs tabular-nums">{(u.created_at ?? '').slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => remove(u)}
                      disabled={busy}
                      className="flex items-center gap-1 text-xs text-ink-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={12} /> 삭제
                    </button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-ink-400 text-sm">회원이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세 */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={() => setDetail(null)}>
          <div className="bg-paper border border-ink w-full max-w-lg max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            {detail.loading ? (
              <div className="p-8 flex items-center gap-2 text-ink-400"><Loader size={16} className="animate-spin" /> 불러오는 중…</div>
            ) : (
              <>
                <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200">
                  <h2 className="text-lg font-bold text-ink">{detail.nickname}</h2>
                  <span className="text-[11px] text-ink-400">{detail.role}</span>
                  <span className="flex-1" />
                  <button onClick={() => setDetail(null)} className="text-ink-400"><X size={18} /></button>
                </div>
                <div className="px-5 py-4 space-y-1 text-sm">
                  <p className="text-ink-600">도장 · {detail.dojo_name ?? detail.home_dojo ?? '—'}</p>
                  <p className="text-ink-600">단 · {detail.dan_grade ? `${detail.dan_grade}단` : '—'}</p>
                  <p className="text-ink-600">응원팀 · {detail.favorite_team ?? '—'}</p>
                  <p className="text-ink-600">
                    접속 IP · <span className="font-mono">{detail.last_ip ?? '기록 없음'}</span>
                    {detail.signup_ip && detail.signup_ip !== detail.last_ip && (
                      <span className="text-ink-400 text-xs"> (가입 시 {detail.signup_ip})</span>
                    )}
                  </p>
                  <p className="text-ink-600">
                    카카오 · {detail.kakao_id
                      ? <span className="bg-[#FEE500] text-[#3C1E1E] px-1.5 py-0.5 text-xs font-bold">연결됨</span>
                      : <span className="text-ink-400">미연결</span>}
                    {detail.kakao_linked_at && (
                      <span className="text-ink-400 text-xs"> · {seenAt(detail.kakao_linked_at)} 연결</span>
                    )}
                  </p>
                  <p className="text-ink-400 text-xs">가입 {detail.created_at}</p>
                </div>

                {/* 같은 IP 계정 — 중복 가입 판별용. 겹친다고 무조건 같은 사람은 아니다 */}
                {detail.same_ip?.length > 0 && (
                  <div className="px-5 pb-4">
                    <h3 className="text-[11px] font-bold tracking-wider text-ink-400 mb-2">
                      같은 IP를 쓰는 계정 {detail.same_ip.length}개
                    </h3>
                    {detail.same_ip.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 py-1.5 border-t border-ink-200 text-sm">
                        <span className="text-ink font-medium">{s.nickname}</span>
                        {s.username && <span className="text-[11px] text-ink-400 font-mono">{s.username}</span>}
                        {s.role !== 'fan' && (
                          <span className="text-[10px] bg-lime text-ink px-1.5 py-0.5 font-bold">{s.role}</span>
                        )}
                        <span className="flex-1" />
                        <span className="text-ink-400 text-xs tabular-nums">{(s.created_at ?? '').slice(0, 10)}</span>
                      </div>
                    ))}
                    <p className="text-ink-400 text-[11px] mt-2">
                      같은 집·도장·통신사에서 접속하면 겹칠 수 있습니다. 중복 가입 확인용 참고 자료입니다.
                    </p>
                  </div>
                )}

                <div className="px-5 pb-4">
                  <h3 className="text-[11px] font-bold tracking-wider text-ink-400 mb-2">
                    픽 {detail.picks?.length ?? 0}건
                  </h3>
                  {detail.picks?.length ? detail.picks.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 py-1.5 border-t border-ink-200 text-sm">
                      <span className="text-ink">{p.division_label}</span>
                      <span className="flex-1" />
                      {p.is_locked ? <span className="text-[10px] text-ink-400">확정</span> : null}
                      <span className="text-ink-600 tabular-nums">{p.score}점</span>
                    </div>
                  )) : <p className="text-ink-400 text-sm">없음</p>}
                </div>

                <div className="px-5 pb-5">
                  <h3 className="text-[11px] font-bold tracking-wider text-ink-400 mb-2">
                    팔로우 {detail.follows?.length ?? 0}명
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.follows?.length ? detail.follows.map((f) => (
                      <span key={f.id} className="text-[11px] border border-ink-200 px-2 py-1">
                        {f.name} <span className="text-ink-400">{f.team}</span>
                      </span>
                    )) : <p className="text-ink-400 text-sm">없음</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
