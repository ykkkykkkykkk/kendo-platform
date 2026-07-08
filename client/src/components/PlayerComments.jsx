import { useState, useEffect } from 'react';
import { Trash2, CornerDownRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr + 'Z')) / 1000);
  if (diff < 60)   return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

function CommentInput({ placeholder, onSubmit, loading }) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  };
  return (
    <div className="flex gap-2">
      <textarea
        rows={1}
        maxLength={300}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
        className="flex-1 bg-paper border border-ink-200 px-3 py-2.5 text-sm text-ink
                   placeholder:text-ink-400/60 focus:outline-none focus:border-ink resize-none transition-colors"
      />
      <button
        onClick={submit}
        disabled={loading || !text.trim()}
        className="px-4 py-2 bg-lime hover:bg-lime-dark text-ink text-sm font-medium rounded-full disabled:opacity-40 flex-none pressable"
      >
        등록
      </button>
    </div>
  );
}

function CommentItem({ comment, slug, onDelete, onReplySubmit, myUserId, isPlayerAccount, targetPlayerId }) {
  const [showReply, setShowReply] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const isMe     = comment.user.id === myUserId;
  const isPlayer = comment.user.role === 'player' && comment.user.player_id === targetPlayerId;

  const handleReply = async (text) => {
    setLoading(true);
    await onReplySubmit(comment.id, text);
    setLoading(false);
    setShowReply(false);
  };

  return (
    <div>
      <div className={`p-4 border ${isPlayer ? 'border-ink' : 'border-ink-200'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-none text-xs font-bold
              ${isPlayer ? 'bg-ink text-white' : 'border border-ink-200 text-ink-600'}`}>
              {comment.user.nickname[0]}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-ink">
                {isPlayer ? <span className="bg-lime px-1">{comment.user.nickname}</span> : comment.user.nickname}
                {isPlayer && <span className="ml-1 text-[10px] border border-ink text-ink px-1.5 py-0.5">선수</span>}
              </span>
              <span className="text-ink-400 text-[10px] ml-2">{timeAgo(comment.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-none">
            {!isMe && (
              <button
                onClick={() => setShowReply((v) => !v)}
                className="text-ink-400 text-[11px] hover:text-ink transition-colors"
              >
                답글
              </button>
            )}
            {isMe && (
              <button onClick={() => onDelete(comment.id)} className="text-ink-400 hover:text-ink transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        <p className="text-ink text-sm mt-2 leading-relaxed">{comment.content}</p>
      </div>

      {/* 답글 목록 */}
      {comment.replies.length > 0 && (
        <div className="ml-4 mt-2 flex flex-col gap-2">
          {comment.replies.map((reply) => {
            const replyIsPlayer = reply.user.role === 'player' && reply.user.player_id === targetPlayerId;
            return (
              <div key={reply.id} className="flex gap-2">
                <CornerDownRight size={14} className="text-ink-400 mt-3 flex-none" />
                <div className={`flex-1 p-3 border ${replyIsPlayer ? 'border-ink' : 'border-ink-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-ink">
                        {replyIsPlayer ? <span className="bg-lime px-1">{reply.user.nickname}</span> : reply.user.nickname}
                        {replyIsPlayer && (
                          <span className="ml-1 text-[10px] border border-ink text-ink px-1.5 py-0.5">선수</span>
                        )}
                      </span>
                      <span className="text-ink-400 text-[10px]">{timeAgo(reply.created_at)}</span>
                    </div>
                    {reply.user.id === myUserId && (
                      <button onClick={() => onDelete(reply.id)} className="text-ink-400 hover:text-ink">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <p className="text-ink-600 text-sm mt-1 leading-relaxed">{reply.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 답글 입력 */}
      {showReply && (
        <div className="ml-8 mt-2">
          <CommentInput placeholder="답글을 입력하세요..." onSubmit={handleReply} loading={loading} />
        </div>
      )}
    </div>
  );
}

export default function PlayerComments({ slug, playerId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [posting,  setPosting]  = useState(false);

  const myUserId        = user?.id ?? null;
  const isPlayerAccount = user?.role === 'player';

  const load = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/players/${slug}/comments`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const handlePost = async (text) => {
    if (!user) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/players/${slug}/comments`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${localStorage.getItem('kendo_token')}`,
        },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (res.ok) setComments((prev) => [...prev, data]);
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (parentId, text) => {
    if (!user) return;
    const res = await fetch(`/api/players/${slug}/comments`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${localStorage.getItem('kendo_token')}`,
      },
      body: JSON.stringify({ content: text, parent_id: parentId }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((prev) => prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...c.replies, data] } : c
      ));
    }
  };

  const handleDelete = async (id) => {
    const res = await fetch(`/api/comments/${id}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('kendo_token')}` },
    });
    if (res.ok) {
      setComments((prev) =>
        prev
          .filter((c) => c.id !== id)
          .map((c) => ({ ...c, replies: c.replies.filter((r) => r.id !== id) }))
      );
    }
  };

  return (
    <div className="mt-4 mb-8">
      <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium mb-3">
        COMMENTS{comments.length > 0 ? ` — ${comments.length}` : ''}
      </p>

      {/* 입력창 */}
      {user ? (
        <div className="mb-4">
          <CommentInput
            placeholder={isPlayerAccount ? '선수로 댓글을 남겨보세요...' : '응원 메시지를 남겨보세요...'}
            onSubmit={handlePost}
            loading={posting}
          />
        </div>
      ) : (
        <div className="mb-4 border border-ink-200 px-4 py-3 text-center">
          <p className="text-ink-400 text-sm">로그인 후 댓글을 남길 수 있습니다.</p>
        </div>
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => <div key={i} className="h-16 bg-ink-200/40 animate-pulse" />)}
        </div>
      ) : comments.length === 0 ? (
        <div className="border border-ink-200 p-5 text-center">
          <p className="text-ink-400 text-sm">아직 댓글이 없어요. 첫 응원을 남겨보세요!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              slug={slug}
              onDelete={handleDelete}
              onReplySubmit={handleReply}
              myUserId={myUserId}
              isPlayerAccount={isPlayerAccount}
              targetPlayerId={playerId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
