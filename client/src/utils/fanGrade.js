/* 등급의 "생김새"만 담는다. 며칠에 무슨 등급인지는 서버가 정하고 내려준다.
   숫자를 양쪽에 두면 언젠가 반드시 어긋나므로 기준값은 여기 두지 않는다. */
export const GRADE_STYLE = {
  bronze: { emoji: '🥉', label: '단골팬', bg: '#F7EFE6', fg: '#8A6234', border: '#C99A61' },
  silver: { emoji: '🥈', label: '열혈팬', bg: '#F2F4F6', fg: '#586570', border: '#AAB4BE' },
  gold:   { emoji: '🥇', label: '찐팬',   bg: '#FCF4DA', fg: '#8A6A15', border: '#D8B845' },
};

export const styleOf = (grade) => (grade ? GRADE_STYLE[grade] ?? null : null);
