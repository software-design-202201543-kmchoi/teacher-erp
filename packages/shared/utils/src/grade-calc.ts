/**
 * 한국 9등급제 성적 계산 유틸리티
 *
 * 공식 석차 등급 기준 (상위 누적 비율):
 * 1등급: 4%, 2등급: 11%, 3등급: 23%, 4등급: 40%, 5등급: 60%,
 * 6등급: 77%, 7등급: 89%, 8등급: 96%, 9등급: 100%
 *
 * 이 모듈에서는 점수(0~100) 기반 단순 기준으로 등급을 산출한다.
 */

export const GRADE_THRESHOLDS: readonly { minScore: number; grade: string }[] = [
  { minScore: 90, grade: '1' },
  { minScore: 80, grade: '2' },
  { minScore: 70, grade: '3' },
  { minScore: 60, grade: '4' },
  { minScore: 50, grade: '5' },
  { minScore: 40, grade: '6' },
  { minScore: 30, grade: '7' },
  { minScore: 20, grade: '8' },
  { minScore: 0,  grade: '9' },
] as const;

/**
 * 점수 배열의 평균을 계산한다.
 * 빈 배열이면 0을 반환한다. 결과는 소수점 2자리로 반올림한다.
 */
export function calcAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, s) => acc + s, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

/**
 * 점수(0~100)를 한국 9등급제 기준으로 변환한다.
 * 반환값은 "1" ~ "9" 문자열이다.
 */
export function calcGrade(score: number): string {
  for (const { minScore, grade } of GRADE_THRESHOLDS) {
    if (score >= minScore) return grade;
  }
  return '9';
}
