import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MessageCircle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useFetch } from '../hooks/useFetch.js';
import InquiryModal from '../components/InquiryModal.jsx';

const CATEGORIES = ['전체', '죽도', '호구', '도복', '하카마', '기타'];

function GearRow({ g, first }) {
  return (
    <div className={`flex gap-4 py-4 ${first ? '' : 'border-t border-ink-200'}`}>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium uppercase">{g.category}</p>
        <p className="text-ink font-bold text-[15px] mt-1 leading-tight tracking-tight">{g.model_name}</p>
        <p className="text-ink-400 text-xs mt-0.5">{g.brand}</p>

        <Link
          to={`/players/${g.player_slug}`}
          className="inline-flex items-center gap-1.5 mt-2 border border-ink-200 rounded-full px-2.5 py-0.5 pressable"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: g.team_color ?? '#111111' }}
          />
          <span className="text-[11px] text-ink-600 font-medium">{g.player_name} 선수 사용</span>
        </Link>
      </div>

      <div className="flex flex-col items-end justify-between flex-shrink-0">
        {g.price_krw ? (
          <p className="text-ink font-bold text-sm tabular-nums">{g.price_krw.toLocaleString()}원</p>
        ) : (
          <span />
        )}

        {g.product_url ? (
          <a
            href={g.product_url}
            target="_blank"
            rel="noreferrer"
            className="pressable bg-lime hover:bg-lime-dark text-ink rounded-full px-4 py-1.5
                       text-xs font-medium whitespace-nowrap mt-1"
          >
            구매 →
          </a>
        ) : (
          <button
            disabled
            className="mt-1 border border-ink-200 text-ink-400 rounded-full px-4 py-1.5
                       text-xs font-medium whitespace-nowrap cursor-not-allowed"
          >
            준비중
          </button>
        )}
      </div>
    </div>
  );
}

export default function Shop() {
  const navigate = useNavigate();
  const [tab,         setTab]         = useState('전체');
  const [showInquiry, setShowInquiry] = useState(false);

  const { data: gear, loading } = useFetch(
    () => fetch('/api/shop/gear').then((r) => r.json()),
    [],
  );

  const filtered = (gear ?? []).filter((g) => tab === '전체' || g.category === tab);

  return (
    <main className="page-body bg-paper min-h-screen">

      {/* ── 헤더 ── */}
      <header className="px-5 pt-12 pb-5 flex items-start justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-ink-400 font-medium">SHOP</p>
          <h1 className="text-4xl font-bold text-ink tracking-[-0.04em] leading-[0.95] mt-1">선수 장비</h1>
          <p className="text-ink-400 text-sm mt-2">프로 선수가 직접 사용하는 장비</p>
        </div>
        <button
          onClick={() => navigate('/search')}
          className="mt-1 w-9 h-9 flex items-center justify-center rounded-full border border-ink-200 text-ink pressable"
          aria-label="선수 검색"
        >
          <Search size={16} strokeWidth={1.8} />
        </button>
      </header>

      {/* ── 카테고리 탭 ── */}
      <div className="scroll-x flex gap-2 px-5 pb-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setTab(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-colors border ${
              tab === cat
                ? 'bg-ink text-white border-ink'
                : 'bg-paper text-ink-600 border-ink-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── 장비 목록 ── */}
      <div className="px-5 pb-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-ink-200/40 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-ink-400 text-sm">아직 등록된 {tab} 장비가 없습니다.</p>
          </div>
        ) : (
          <div style={{ borderTop: '1.5px solid #111111' }}>
            {filtered.map((g, i) => <GearRow key={g.id} g={g} first={i === 0} />)}
          </div>
        )}
      </div>

      {/* ── 입점 배너 — 반전 블록 ── */}
      <div className="mx-5 bg-block rounded-2xl">
        <div className="p-5">
          <p className="text-[10px] tracking-[0.2em] font-medium" style={{ color: '#D8FF3E' }}>PARTNERSHIP</p>
          <p className="text-white font-bold text-sm mt-2">장비 입점 문의</p>
          <p className="text-white/50 text-xs mt-0.5">검도 브랜드라면 누구든 환영합니다</p>
          <button
            onClick={() => setShowInquiry(true)}
            className="mt-4 bg-lime hover:bg-lime-dark text-ink text-xs font-medium px-4 py-2 rounded-full pressable"
          >
            문의하기 →
          </button>
        </div>
      </div>

      {/* ── 고객센터 버튼 ── */}
      <button
        onClick={() => setShowInquiry(true)}
        className="mx-5 mt-3 mb-6 w-[calc(100%-2.5rem)] flex items-center justify-center gap-2
                   border border-ink-200 rounded-full py-3 text-ink-600 text-sm font-medium
                   hover:border-ink transition-colors pressable"
      >
        <MessageCircle size={15} />
        고객센터 / 문의하기
      </button>

      <AnimatePresence>
        {showInquiry && <InquiryModal onClose={() => setShowInquiry(false)} />}
      </AnimatePresence>

    </main>
  );
}
