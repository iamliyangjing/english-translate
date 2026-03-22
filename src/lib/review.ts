const MIN_EASE_FACTOR = 1.3;
const MAX_EASE_FACTOR = 3.4;
const DEFAULT_EASE_FACTOR = 2.5;
const DEFAULT_INTERVAL_DAYS = 0;
const AGAIN_INTERVAL_MINUTES = 10;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MINUTE_IN_DAYS = 1 / 1440;

export type ReviewGrade = 1 | 2 | 3 | 4;

export type ReviewState = {
  reviewCount?: number | null;
  lapseCount?: number | null;
  easeFactor?: number | null;
  intervalDays?: number | null;
};

export type ReviewSchedule = {
  nextReviewAt: Date;
  intervalDays: number;
  easeFactor: number;
  reviewCount: number;
  lapseCount: number;
  label: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundTo = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export const isReviewGrade = (value: number): value is ReviewGrade =>
  Number.isInteger(value) && value >= 1 && value <= 4;

export const formatReviewInterval = (intervalDays: number) => {
  const totalMinutes = Math.max(1, Math.round(intervalDays * 1440));

  if (totalMinutes < 60) {
    return `${totalMinutes} 分钟后`;
  }

  if (totalMinutes < 1440) {
    const hours = roundTo(totalMinutes / 60, 1);
    return `${hours} 小时后`;
  }

  if (intervalDays < 30) {
    const days = roundTo(intervalDays, intervalDays >= 10 ? 0 : 1);
    return `${days} 天后`;
  }

  const months = roundTo(intervalDays / 30, 1);
  return `${months} 个月后`;
};

export const getReviewSchedule = (
  state: ReviewState,
  grade: ReviewGrade,
  now = new Date(),
): ReviewSchedule => {
  const currentEase = clamp(
    state.easeFactor ?? DEFAULT_EASE_FACTOR,
    MIN_EASE_FACTOR,
    MAX_EASE_FACTOR,
  );
  const currentInterval = Math.max(0, state.intervalDays ?? DEFAULT_INTERVAL_DAYS);
  const currentReviewCount = Math.max(0, state.reviewCount ?? 0);
  const currentLapseCount = Math.max(0, state.lapseCount ?? 0);
  const isFirstReview = currentReviewCount === 0;

  let easeFactor = currentEase;
  let intervalDays = currentInterval;
  let lapseCount = currentLapseCount;

  switch (grade) {
    case 1:
      easeFactor = clamp(currentEase - 0.2, MIN_EASE_FACTOR, MAX_EASE_FACTOR);
      intervalDays = AGAIN_INTERVAL_MINUTES * MINUTE_IN_DAYS;
      lapseCount += 1;
      break;
    case 2:
      easeFactor = clamp(currentEase - 0.1, MIN_EASE_FACTOR, MAX_EASE_FACTOR);
      intervalDays = isFirstReview ? 1 : Math.max(1, currentInterval * 1.2);
      break;
    case 3:
      intervalDays = isFirstReview ? 3 : Math.max(1, currentInterval * currentEase);
      break;
    case 4:
      easeFactor = clamp(currentEase + 0.15, MIN_EASE_FACTOR, MAX_EASE_FACTOR);
      intervalDays = isFirstReview
        ? 5
        : Math.max(2, currentInterval * (currentEase + 0.35));
      break;
  }

  const nextIntervalDays = roundTo(intervalDays);
  const nextReviewAt = new Date(now.getTime() + nextIntervalDays * DAY_IN_MS);

  return {
    nextReviewAt,
    intervalDays: nextIntervalDays,
    easeFactor: roundTo(easeFactor),
    reviewCount: currentReviewCount + 1,
    lapseCount,
    label: formatReviewInterval(nextIntervalDays),
  };
};
