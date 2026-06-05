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
        className="flex-1 bg-black-900 border border-black-700 rounded-xl px-3 py-2.5 text-sm text-white
                   placeholder:text-white/25 focus:outline-none focus:border-orange-500 resize-none transition-colors"
      />
      <button
        onClick={submit}
        disabled={loading || !text.trim()}
        className="px-4 py-2 bg-orange-500 text-black text-sm font-bold rounded-xl disabled:opacity-40 flex-none"
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
      <div className={`rounded-2xl p-4 ${isPlayer ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-black-900 border border-black-700'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-none text-xs font-bold
              ${isPlayer ? 'bg-orange-500 text-black' : 'bg-black-700 text-white/60'}`}>
              {comment.user.nickname[0]}
            </div>
            <div className="min-w-0">
              <span className={`text-xs font-bold ${isPlayer ? 'text-orange-400' : 'text-white/60'}`}>
                {comment.user.nickname}
                {isPlayer && <span className="ml-1 text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">선수</span>}
              </span>
              <span className="text-white/25 text-[10px] ml-2">{timeAgo(comment.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-none">
            {!isMe && (
              <button
                onClick={() => setShowReply((v) => !v)}
                className="text-white/30 text-[11px] hover:text-orange-500 transition-colors"
              >
                답글
              </button>
            )}
            {isMe && (
              <button onClick={() => onDelete(comment.id)} className="text-white/20 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        <p className="text-white/80 text-sm mt-2 leading-relaxed">{comment.content}</p>
      </div>

      {/* 답글 목록 */}
      {comment.replies.length > 0 && (
        <div className="ml-4 mt-2 flex flex-col gap-2">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-2">
              <CornerDownRight size={14} className="text-white/20 mt-3 flex-none" />
              <div className={`flex-1 rounded-xl p-3 ${
                reply.user.role === 'player' && reply.user.player_id === targetPlayerId
                  ? 'bg-orange-500/10 border border-orange-500/20'
                  : 'bg-black-800 border border-black-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${
                      reply.user.role === 'player' && reply.user.player_id === targetPlayerId
                        ? 'text-orange-400' : 'text-white/50'
                    }`}>
                      {reply.user.nickname}
                      {reply.user.role === 'player' && reply.user.player_id === targetPlayerId && (
                        <span className="ml-1 text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">선수</span>
                      )}
                    </span>
                    <span className="text-white/20 text-[10px]">{timeAgo(reply.created_at)}</span>
                  </div>
                  {reply.user.id === myUserId && (
                    <button onClick={() => onDelete(reply.id)} className="text-white/20 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="text-white/70 text-sm mt-1 leading-relaxed">{reply.content}</p>
              </div>
            </div>
          ))}
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
      <h2 className="text-xs font-semibold text-white/35 uppercase tracking-wide mb-3">
        댓글 {comments.length > 0 ? `(${comments.length})` : ''}
      </h2>

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
        <div className="mb-4 bg-black-900 border border-black-700 rounded-xl px-4 py-3 text-center">
          <p className="text-white/30 text-sm">로그인 후 댓글을 남길 수 있습니다.</p>
        </div>
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => <div key={i} className="h-16 bg-black-900 rounded-2xl animate-pulse" />)}
        </div>
      ) : comments.length === 0 ? (
        <div className="bg-black-900 border border-black-700 rounded-2xl p-5 text-center">
          <p className="text-white/30 text-sm">아직 댓글이 없어요. 첫 응원을 남겨보세요!</p>
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
