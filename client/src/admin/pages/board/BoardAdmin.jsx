import { useState, useEffect, useCallback } from 'react';
import { adminGet, adminPut, adminDelete } from '../../adminApi.js';

/* 게시판은 관리자가 두 가지 눈으로 본다:
   급한 것(신고 쌓인 것)과 전체 흐름(글 목록). 탭으로 나눈다. */

const TOKEN_KEY = 'kendo_admin_token';

/* 삭제는 공개 라우트(/api/board/...)가 x-admin-token도 받아준다.
   adminApi는 /api/admin 접두사가 붙어 있어 여기서만 직접 부른다. */
const deleteAsAdmin = (path) =>
  fetch('/api/board' + path, {
    method: 'DELETE',
    headers: { 'x-admin-token': localStorage.getItem(TOKEN_KEY) ?? '' },
  });

const when = (s) => (s ? String(s).replace('T', ' ').slice(0, 16) : '');

/* ── 신고 목록 ─────────────────────────────────────────── */
function Reports({ onChanged }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await adminGet('/board/reports');
    setRows(Array.isArray(r) ? r : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setBlind = async (row, blinded) => {
    await adminPut('/board/blind', {
      target_type: row.target_type, target_id: row.target_id, blinded,
    });
    await load(); onChanged?.();
  };

  const remove = async (row) => {
    const path = row.target_type === 'post' ? `/${row.target_id}` : `/comment/${row.target_id}`;
    await deleteAsAdmin(path);
    await load(); onChanged?.();
  };

  if (loading) return <p className="text-ink-400 text-sm">불러오는 중...</p>;
  if (rows.length === 0) return <p className="text-ink-400 text-sm">신고된 글이나 댓글이 없습니다.</p>;

  return (
    <div style={{ borderTop: '1.5px solid #111111' }}>
      {rows.map((r) => (
        <div key={`${r.target_type}-${r.target_id}`} className="py-4 border-b border-ink-200">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-1.5 py-0.5 border border-ink-200 text-ink-600">
                  {r.target_type === 'post' ? '글' : '댓글'}
                </span>
                {/* 신고 3명이면 자동으로 가려진 상태다 */}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 ${
                  r.report_count >= 3 ? 'bg-ink text-white' : 'bg-lime text-ink'
                }`}>
                  신고 {r.report_count}
                </span>
                {!!r.is_blinded && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 border border-ink text-ink">가려짐</span>
                )}
                <span className="text-[11px] text-ink-400">{r.author}</span>
                <span className="text-[11px] text-ink-400">{when(r.last_reported_at)}</span>
              </div>

              <p className="text-ink text-sm mt-1.5 break-words line-clamp-2">{r.preview}</p>
              {r.reasons && <p className="text-ink-400 text-xs mt-1">사유: {r.reasons}</p>}

              <a
                href={`/board/${r.post_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-ink text-xs font-semibold mt-1.5 underline"
              >
                글 보기 →
              </a>
            </div>

            <div className="flex flex-col gap-1.5 flex-none">
              {r.is_blinded ? (
                <button
                  onClick={() => setBlind(r, false)}
                  className="px-3 py-1.5 text-xs font-medium bg-lime hover:bg-lime-dark text-ink whitespace-nowrap"
                >
                  블라인드 해제
                </button>
              ) : (
                <button
                  onClick={() => setBlind(r, true)}
                  className="px-3 py-1.5 text-xs font-medium border border-ink text-ink hover:bg-ink hover:text-white whitespace-nowrap"
                >
                  가리기
                </button>
              )}
              <button
                onClick={() => remove(r)}
                className="px-3 py-1.5 text-xs font-medium border border-ink-200 text-ink-600 hover:border-ink whitespace-nowrap"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 전체 글 ───────────────────────────────────────────── */
function Posts({ onChanged }) {
  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(null);   // 댓글 펼친 글 id
  const [comments, setComments] = useState([]);

  const load = useCallback(async (p) => {
    setLoading(true);
    const r = await adminGet(`/board/posts?page=${p}`);
    setRows(r?.posts ?? []);
    setTotal(r?.total ?? 0);
    setPage(p);
    setLoading(false);
  }, []);

  useEffect(() => { load(1); }, [load]);

  const toggleComments = async (id) => {
    if (open === id) { setOpen(null); setComments([]); return; }
    const r = await adminGet(`/board/posts/${id}/comments`);
    setComments(Array.isArray(r) ? r : []);
    setOpen(id);
  };

  const removePost = async (id) => {
    await deleteAsAdmin(`/${id}`);
    if (open === id) { setOpen(null); setComments([]); }
    await load(page); onChanged?.();
  };

  const removeComment = async (cid, postId) => {
    await deleteAsAdmin(`/comment/${cid}`);
    const r = await adminGet(`/board/posts/${postId}/comments`);
    setComments(Array.isArray(r) ? r : []);
    await load(page); onChanged?.();
  };

  const setBlind = async (type, id, blinded, postId) => {
    await adminPut('/board/blind', { target_type: type, target_id: id, blinded });
    if (type === 'comment' && postId) {
      const r = await adminGet(`/board/posts/${postId}/comments`);
      setComments(Array.isArray(r) ? r : []);
    }
    await load(page); onChanged?.();
  };

  if (loading) return <p className="text-ink-400 text-sm">불러오는 중...</p>;
  if (rows.length === 0) return <p className="text-ink-400 text-sm">아직 글이 없습니다.</p>;

  const pages = Math.ceil(total / 30);

  return (
    <>
      <div style={{ borderTop: '1.5px solid #111111' }}>
        {rows.map((p) => (
          <div key={p.id} className="py-4 border-b border-ink-200">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-ink-400 tabular-nums">#{p.id}</span>
                  {!!p.is_blinded && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-ink text-white">가려짐</span>
                  )}
                  {p.report_count > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-lime text-ink">신고 {p.report_count}</span>
                  )}
                </div>

                <p className="text-ink font-bold text-sm mt-1">{p.title}</p>
                <p className="text-ink-600 text-xs mt-1 line-clamp-2 break-words">{p.content}</p>

                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-ink-400">
                  <span className="text-ink font-medium">{p.nickname}</span>
                  {p.dojo_name && <span>· {p.dojo_name}</span>}
                  <span>· {when(p.created_at)}</span>
                  <span>· ♥{p.like_count}</span>
                  <button onClick={() => toggleComments(p.id)} className="underline text-ink">
                    댓글 {p.comment_count}{open === p.id ? ' 닫기' : ' 보기'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 flex-none">
                <button
                  onClick={() => setBlind('post', p.id, !p.is_blinded)}
                  className={`px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                    p.is_blinded
                      ? 'bg-lime hover:bg-lime-dark text-ink'
                      : 'border border-ink text-ink hover:bg-ink hover:text-white'
                  }`}
                >
                  {p.is_blinded ? '블라인드 해제' : '가리기'}
                </button>
                <button
                  onClick={() => removePost(p.id)}
                  className="px-3 py-1.5 text-xs font-medium border border-ink-200 text-ink-600 hover:border-ink whitespace-nowrap"
                >
                  삭제
                </button>
              </div>
            </div>

            {/* 댓글 펼침 */}
            {open === p.id && (
              <div className="mt-3 ml-4 pl-4" style={{ borderLeft: '2px solid #E5E5E5' }}>
                {comments.length === 0 ? (
                  <p className="text-ink-400 text-xs py-2">댓글이 없습니다.</p>
                ) : comments.map((c) => (
                  <div key={c.id} className="py-2 flex items-start gap-3 border-b border-ink-200 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        {c.parent_id && <span className="text-ink-200">└</span>}
                        <span className="text-ink font-medium">{c.nickname}</span>
                        {c.dojo_name && <span className="text-ink-400">· {c.dojo_name}</span>}
                        <span className="text-ink-400">· {when(c.created_at)}</span>
                        {!!c.is_blinded && <span className="font-bold px-1 bg-ink text-white">가려짐</span>}
                        {!!c.is_deleted && <span className="text-ink-400">삭제됨</span>}
                        {c.report_count > 0 && <span className="font-bold px-1 bg-lime text-ink">신고 {c.report_count}</span>}
                      </div>
                      <p className="text-ink text-xs mt-0.5 break-words">{c.content}</p>
                    </div>
                    <div className="flex gap-1.5 flex-none">
                      <button
                        onClick={() => setBlind('comment', c.id, !c.is_blinded, p.id)}
                        className="px-2 py-1 text-[11px] border border-ink-200 text-ink-600 hover:border-ink whitespace-nowrap"
                      >
                        {c.is_blinded ? '해제' : '가리기'}
                      </button>
                      <button
                        onClick={() => removeComment(c.id, p.id)}
                        className="px-2 py-1 text-[11px] border border-ink-200 text-ink-600 hover:border-ink whitespace-nowrap"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={() => load(page - 1)} disabled={page <= 1}
            className="px-3 py-1.5 text-sm border border-ink-200 text-ink-600 disabled:opacity-40"
          >이전</button>
          <span className="text-sm text-ink-600 tabular-nums">{page} / {pages}</span>
          <button
            onClick={() => load(page + 1)} disabled={page >= pages}
            className="px-3 py-1.5 text-sm border border-ink-200 text-ink-600 disabled:opacity-40"
          >다음</button>
        </div>
      )}
    </>
  );
}

/* ── 페이지 ────────────────────────────────────────────── */
export default function BoardAdmin() {
  const [tab,  setTab]  = useState('reports');
  const [tick, setTick] = useState(0);   // 조치 후 신고 배지 새로 세기

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">BOARD</p>
        <h1 className="text-3xl font-bold text-ink tracking-[-0.03em] mt-1">자유게시판</h1>
        <p className="text-ink-400 text-sm mt-1.5">
          서로 다른 3명이 신고하면 자동으로 가려집니다. 해제하면 쌓인 신고도 함께 지워집니다.
        </p>
      </div>

      <div className="flex gap-2 mb-5">
        {[['reports', '신고 관리'], ['posts', '전체 글']].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === v ? 'bg-ink text-white' : 'text-ink-600 border border-ink-200 hover:border-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'reports'
        ? <Reports key={`r${tick}`} onChanged={() => setTick((t) => t + 1)} />
        : <Posts   key={`p${tick}`} onChanged={() => setTick((t) => t + 1)} />}
    </div>
  );
}
