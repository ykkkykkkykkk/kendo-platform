/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ═══ 매거진 에디토리얼 토큰 (현행) ═══════════════════════════
        paper: '#FFFFFF',      // 메인 배경
        ink: {
          DEFAULT: '#111111',  // 메인 텍스트, 강한 룰
          600: '#666666',      // 보조 텍스트
          400: '#999999',      // 캡션
          200: '#E5E5E5',      // 약한 디바이더
        },
        lime: {
          DEFAULT: '#D8FF3E',  // 유일한 액센트. 남발 금지
          dark: '#B8DD1E',     // hover
        },
        block: '#111111',      // 반전 블록(다크 카드) 배경
        // ═════════════════════════════════════════════════════════════

        // ── DEPRECATED: 다크+네온오렌지 시절 (마이그레이션 후 삭제) ──
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
        black: {
          DEFAULT: '#050505',
          900: '#0A0A0A',
          800: '#0F0F0F',
          700: '#1A1A1A',
        },
        orange: {
          400: '#FFA033',
          500: '#FF8800',
          600: '#E67700',
        },
        surface: {
          DEFAULT: '#141414',
          hover:   '#1A1A1A',
          border:  '#2A2A2A',
        },
        accent:  '#FF8800',
        medal: {
          gold:   '#FFD700',
          silver: '#C7C7CC',
          bronze: '#CD7F32',
        },
        // ─────────────────────────────────────────────────────────────
      },
      // DEPRECATED: 글로우/네온 효과 제거 대상 — 사용 금지
      boxShadow: {
        'glow-sm':     'none',
        'glow':        'none',
        'glow-lg':     'none',
        'glow-strong': 'none',
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
