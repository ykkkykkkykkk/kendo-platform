import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useFetch } from '../hooks/useFetch.js';

const CATEGORIES = ['전체', '죽도', '호구', '도복', '하카마', '기타'];
const GEAR_ICON  = { 죽도: '🎋', 호구: '🛡️', 도복: '👘', 하카마: '🥋', 기타: '📦' };

function useDarkBody() {
  useEffect(() => {
    document.body.classList.add('predict-dark');
    return () => document.body.classList.remove('predict-dark');
  }, []);
}

function GearCard({ g }) {
  return (
    <div className="bg-black-900 border border-black-700 rounded-2xl p-4 flex gap-4">
      <div className="w-16 h-16 rounded-xl bg-black-700 flex items-center justify-center text-3xl flex-shrink-0">
        {GEAR_ICON[g.category] ?? '📦'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-orange-500 font-semibold uppercase tracking-wider">{g.category}</p>
        <p className="text-white font-bold text-sm mt-0.5 leading-tight">{g.model_name}</p>
        <p className="text-white/40 text-xs">{g.brand}</p>

        <Link
          to={`/players/${g.player_slug}`}
          className="inline-flex items-center gap-1.5 mt-2 bg-orange-500/8 rounded-full px-2 py-0.5 active:bg-orange-500/15"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: g.team_color ?? '#FF8800' }}
          />
          <span className="text-[11px] text-orange-500/80 font-medium">{g.player_name} 선수 사용</span>
        </Link>
      </div>

      <div className="flex flex-col items-end justify-between flex-shrink-0">
        {g.price_krw ? (
          <p className="text-white font-bold text-sm">{g.price_krw.toLocaleString()}원</p>
        ) : (
          <span />
        )}

        {g.product_url ? (
          <div className="flex flex-col items-end gap-1 mt-1">
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10
                             px-2 py-0.5 rounded-full whitespace-nowrap">
              구매 가능
            </span>
            <a
              href={g.product_url}
              target="_blank"
              rel="noreferrer"
              className="pressable bg-orange-500 text-black rounded-full px-3 py-1.5
                         text-xs font-bold whitespace-nowrap"
            >
              구매
            </a>
          </div>
        ) : (
          <button
            disabled
            className="mt-1 bg-black-700 text-white/30 rounded-full px-3 py-1.5
                       text-xs font-semibold whitespace-nowrap cursor-not-allowed"
          >
            준비중
          </button>
        )}
      </div>
    </div>
  );
}

export default function Shop() {
  useDarkBody();
  const navigate = useNavigate();
  const [tab, setTab] = useState('전체');

  const { data: gear, loading } = useFetch(
    () => fetch('/api/shop/gear').then((r) => r.json()),
    [],
  );

  const filtered = (gear ?? []).filter((g) => tab === '전체' || g.category === tab);

  return (
    <main className="page-body bg-black">

      {/* ── 헤더 ── */}
      <header className="px-4 pt-12 pb-4 border-b border-black-700 flex items-start justify-between">
        <div>
          <p className="text-[10px] text-orange-500 font-medium tracking-[0.2em] uppercase">Shop</p>
          <h1 className="text-3xl font-bold text-white leading-tight">선수 장비</h1>
          <p className="text-white/40 text-sm mt-1">프로 선수가 직접 사용하는 장비</p>
        </div>
        <button
          onClick={() => navigate('/search')}
          className="mt-1 w-9 h-9 flex items-center justify-center rounded-full bg-black-900 text-white/60 active:opacity-60"
          aria-label="선수 검색"
        >
          <Search size={18} />
        </button>
      </header>

      {/* ── 카테고리 탭 ── */}
      <div className="scroll-x flex gap-2 px-4 py-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setTab(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              tab === cat
                ? 'bg-orange-500 text-black'
                : 'bg-black-700 text-white/60 active:bg-black-800'
            }`}
          >
            {GEAR_ICON[cat] ? `${GEAR_ICON[cat]} ${cat}` : cat}
          </button>
        ))}
      </div>

      {/* ── 장비 목록 ── */}
      <div className="px-4 flex flex-col gap-3 pb-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-black-900 rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl mb-3">{GEAR_ICON[tab] ?? '📦'}</p>
            <p className="text-white/40 text-sm">아직 등록된 {tab} 장비가 없습니다.</p>
          </div>
        ) : (
          filtered.map((g) => <GearCard key={g.id} g={g} />)
        )}
      </div>

      {/* ── 입점 배너 ── */}
      <div className="mx-4 mb-6 rounded-2xl overflow-hidden border border-orange-500/20"
           style={{ background: 'linear-gradient(135deg, #150F00 0%, #1C1400 100%)' }}>
        <div className="p-5 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-white font-bold text-sm">장비 입점 문의</p>
            <p className="text-white/50 text-xs mt-0.5">검도 브랜드라면 누구든 환영합니다</p>
            <button className="mt-3 bg-orange-500 text-black text-xs font-bold px-4 py-1.5 rounded-full active:opacity-80">
              문의하기 →
            </button>
          </div>
          <div className="text-5xl select-none opacity-30">🥋</div>
        </div>
      </div>

    </main>
  );
}
