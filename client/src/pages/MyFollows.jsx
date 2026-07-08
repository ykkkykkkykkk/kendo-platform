import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { ScrollReveal } from '../components/ScrollReveal.jsx';
import PlayerAvatar from '../components/PlayerAvatar.jsx';

export default function MyFollows() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data, loading, refetch } = useFetch(api.myFollows);
  const [menuId, setMenuId] = useState(null);

  const unfollow = async (playerId) => {
    try {
      const res = await fetch(`/api/me/follows/${playerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('kendo_token')}` },
      });
      if (!res.ok) throw new Error();
      showToast('팬 해제됐습니다', 'success');
      refetch();
    } catch { showToast('오류가 발생했습니다', 'error'); }
    setMenuId(null);
  };

  const list = Array.isArray(data) ? data : [];

  return (
    <main className="page-body bg-paper min-h-screen">
      <header className="px-5 pt-12 pb-5 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 pressable"
        >
          <ChevronLeft size={18} className="text-ink" />
        </button>
        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">FOLLOWING</p>
          <h1 className="text-ink font-bold text-lg tracking-tight leading-tight">응원 중인 선수</h1>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center pt-20">
          <div className="w-8 h-8 border-2 border-ink border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="px-5 py-20 text-center">
          <p className="text-ink-600 text-sm mb-1">아직 응원 중인 선수가 없어요</p>
          <p className="text-ink-400 text-xs mb-6">선수 프로필에서 팬 등록해보세요</p>
          <Link to="/teams" className="inline-block px-5 py-2.5 bg-lime hover:bg-lime-dark text-ink text-sm font-medium rounded-full pressable">
            선수 찾기 →
          </Link>
        </div>
      ) : (
        <div className="mx-5" style={{ borderTop: '1.5px solid #111111' }}>
          {list.map((p, i) => (
            <ScrollReveal key={p.id} delay={i * 0.04}>
              <div className={`flex items-center gap-3 py-4 relative ${i > 0 ? 'border-t border-ink-200' : ''}`}>
                <Link to={`/players/${p.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <PlayerAvatar slug={p.slug} name={p.name} color={p.color_primary}
                    size={40} profileImageUrl={p.profile_image_url} />
                  <div className="min-w-0">
                    <p className="text-ink font-bold text-sm truncate">{p.name}</p>
                    <p className="text-ink-400 text-xs mt-0.5">{p.team_name} · {p.dan_grade}단</p>
                  </div>
                </Link>
                <button onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                  className="text-ink-400 p-1 flex-none pressable">
                  <MoreHorizontal size={18} />
                </button>
                {menuId === p.id && (
                  <div className="absolute right-2 top-12 z-10 bg-paper border border-ink shadow-lg overflow-hidden">
                    <button onClick={() => unfollow(p.id)}
                      className="px-5 py-3 text-ink text-sm font-semibold w-full text-left hover:bg-ink-200/30">
                      팬 해제
                    </button>
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </main>
  );
}
