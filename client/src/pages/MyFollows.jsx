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
    <main className="page-body bg-[#050505] min-h-screen">
      <header className="px-5 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white/60"><ChevronLeft size={22} /></button>
        <h1 className="text-white font-bold text-base">응원 중인 선수</h1>
      </header>

      {loading ? (
        <div className="flex justify-center pt-20">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="px-5 py-20 text-center">
          <p className="text-white/40 text-sm mb-1">아직 응원 중인 선수가 없어요</p>
          <p className="text-white/25 text-xs mb-6">선수 프로필에서 팬 등록해보세요</p>
          <Link to="/teams" className="inline-block px-5 py-2.5 bg-orange-500 text-black text-sm font-bold rounded-full">
            선수 찾기 →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-black-700 border-t border-black-700">
          {list.map((p, i) => (
            <ScrollReveal key={p.id} delay={i * 0.04}>
              <div className="flex items-center gap-3 px-5 py-4 relative">
                <Link to={`/players/${p.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <PlayerAvatar slug={p.slug} name={p.name} color={p.color_primary}
                    size={44} profileImageUrl={p.profile_image_url} />
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-white/35 text-xs">{p.team_name} · {p.dan_grade}단</p>
                  </div>
                </Link>
                <button onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                  className="text-white/30 p-1 flex-none">
                  <MoreHorizontal size={18} />
                </button>
                {menuId === p.id && (
                  <div className="absolute right-4 top-12 z-10 bg-black-800 border border-black-700 rounded-xl shadow-xl overflow-hidden">
                    <button onClick={() => unfollow(p.id)}
                      className="px-5 py-3 text-red-400 text-sm font-semibold w-full text-left hover:bg-black-700">
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
