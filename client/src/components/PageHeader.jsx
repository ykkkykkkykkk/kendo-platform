import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function PageHeader({ title, right }) {
  const navigate = useNavigate();
  return (
    <header className="flex items-center gap-3 px-4 pt-12 pb-4 bg-white sticky top-0 z-40">
      <button
        onClick={() => navigate(-1)}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 19l-7-7 7-7" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <h1 className="flex-1 text-lg font-bold text-navy">{title}</h1>
      <button
        onClick={() => navigate('/search')}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ink-50 text-ink-600"
        aria-label="선수 검색"
      >
        <Search size={18} />
      </button>
      {right}
    </header>
  );
}
