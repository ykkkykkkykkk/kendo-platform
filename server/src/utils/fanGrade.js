/* ── 팬 등급 사다리 ──
   선수마다 독립이다. 박지훈 찐팬이어도 김정환은 0일부터 시작한다.

   기준은 "누적" 응원 일수다. 연속이 아니다.
   연속으로 하면 하루 빠뜨린 순간 처음으로 돌아가는데, 그러면 응원이 숙제가 된다.
   빠진 날은 그냥 안 세고 넘어간다. */
export const FAN_GRADES = [
  { key: 'gold',   days: 100, label: '찐팬',   emoji: '🥇' },
  { key: 'silver', days: 30,  label: '열혈팬', emoji: '🥈' },
  { key: 'bronze', days: 7,   label: '단골팬', emoji: '🥉' },
];

/** 찐팬 명단에 올라가는 기준. */
export const TRUE_FAN_DAYS = 100;

/** 지금 등급. 아직 7일이 안 됐으면 null. */
export function gradeOf(days) {
  return FAN_GRADES.find((g) => days >= g.days) ?? null;
}

/** 다음에 도달할 등급. 이미 최고 등급이면 null. */
export function nextGradeOf(days) {
  // FAN_GRADES는 높은 순이므로 뒤에서부터 훑어 아직 못 넘은 첫 등급을 찾는다
  for (let i = FAN_GRADES.length - 1; i >= 0; i--) {
    if (days < FAN_GRADES[i].days) return FAN_GRADES[i];
  }
  return null;
}

/** 화면이 필요로 하는 값을 한 번에. */
export function gradeInfo(days) {
  const cur  = gradeOf(days);
  const next = nextGradeOf(days);
  return {
    days,
    grade:      cur?.key   ?? null,
    gradeLabel: cur?.label ?? null,
    gradeEmoji: cur?.emoji ?? null,
    nextGrade:  next?.key   ?? null,
    nextLabel:  next?.label ?? null,
    daysToNext: next ? next.days - days : null,
  };
}
