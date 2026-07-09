/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ═══ 매거진 에디토리얼 팔레트 ═══════════════════════════════
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
