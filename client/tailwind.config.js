/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── DEPRECATED (남겨둠, 삭제 금지) ──────────────────────────
        navy: {
          DEFAULT: '#0A1F44',
          900: '#0A1428',
          800: '#0F1B33',
          700: '#1A2745',
          50:  '#F4F6FA',
        },
        gold: {
          DEFAULT: '#C9A961',
          500: '#C9A961',
          300: '#E8D9A8',
        },
        card: '#F7F8FA',
        sub:  '#5A6478',
        // ─────────────────────────────────────────────────────────────

        // ── NEW: 카본 블랙 팔레트 ────────────────────────────────────
        black: {
          DEFAULT: '#050505',
          900: '#0A0A0A',
          800: '#0F0F0F',
          700: '#1A1A1A',
        },
        // ── NEW: 잉크 (텍스트 계층) ──────────────────────────────────
        ink: {
          900: '#0A0F1A',   // deprecated
          600: '#4A5568',   // deprecated
          500: '#444444',
          400: '#666666',
          300: '#888888',
          100: '#FFFFFF',
        },
        // ── NEW: 오렌지 (주요 액센트) ────────────────────────────────
        orange: {
          400: '#FFA033',
          500: '#FF8800',
          600: '#E67700',
        },
        // ── 픽 시스템 서피스 ─────────────────────────────────────────
        surface: {
          DEFAULT: '#141414',
          hover:   '#1A1A1A',
          border:  '#2A2A2A',
        },
        // ── 기존 accent (→ orange-500 로 마이그레이션됨) ─────────────
        accent:  '#FF8800',
        // ── 메달 (변경 금지) ──────────────────────────────────────────
        medal: {
          gold:   '#FFD700',
          silver: '#C7C7CC',
          bronze: '#CD7F32',
        },
      },
      boxShadow: {
        'glow-sm':     '0 0 8px #FF880060',
        'glow':        '0 0 12px #FF8800',
        'glow-lg':     '0 0 24px #FF880060',
        'glow-strong': '0 0 36px #FF880080',
      },
      fontFamily: {
        sans:       ['Pretendard', 'system-ui', 'sans-serif'],
        pretendard: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        mobile: '480px',
      },
    },
  },
  plugins: [],
};
