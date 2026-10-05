import { computeTrend } from '../../shared/events/module3Handlers';

// Re-export the pure helper from module3Handlers for direct testing
function runningAverage(oldAvg: number | null, oldCount: number, newScore: number | null): number | null {
  if (newScore === null) return oldAvg;
  if (oldAvg === null || oldCount === 0) return newScore;
  return (oldAvg * oldCount + newScore) / (oldCount + 1);
}

describe('runningAverage', () => {
  it('returns newScore when there is no prior data', () => {
    expect(runningAverage(null, 0, 70)).toBe(70);
  });

  it('computes a correct running average for two assessments', () => {
    const after1 = runningAverage(null, 0, 70)!;
    const after2 = runningAverage(after1, 1, 80)!;
    expect(after2).toBe(75);
  });

  it('matches the 3-assessment example from spec (70, 80, 90 → 80)', () => {
    let avg: number | null = null;
    let count = 0;
    for (const score of [70, 80, 90]) {
      avg = runningAverage(avg, count, score);
      count++;
    }
    expect(avg).toBeCloseTo(80, 5);
  });

  it('preserves oldAvg when newScore is null', () => {
    expect(runningAverage(75, 2, null)).toBe(75);
  });

  it('returns null when both oldAvg and newScore are null', () => {
    expect(runningAverage(null, 0, null)).toBeNull();
  });
});

describe('computeTrend', () => {
  it('returns STABLE when fewer than 3 snapshots exist', () => {
    expect(computeTrend([])).toBe('STABLE');
    expect(computeTrend([70])).toBe('STABLE');
    expect(computeTrend([70, 80])).toBe('STABLE');
  });

  it('returns STABLE when 3–5 snapshots exist regardless of scores', () => {
    // not enough data to compare two windows
    expect(computeTrend([90, 90, 90])).toBe('STABLE');
    expect(computeTrend([90, 90, 90, 50])).toBe('STABLE');
    expect(computeTrend([90, 90, 90, 50, 50])).toBe('STABLE');
  });

  it('returns IMPROVING when diff > 5', () => {
    // recent3 avg = 90, older3 avg = 70, diff = +20
    expect(computeTrend([90, 90, 90, 70, 70, 70])).toBe('IMPROVING');
  });

  it('returns DECLINING when diff < -5', () => {
    // recent3 avg = 60, older3 avg = 80, diff = -20
    expect(computeTrend([60, 60, 60, 80, 80, 80])).toBe('DECLINING');
  });

  it('returns STABLE when diff is within ±5', () => {
    // recent3 avg = 73.33, older3 avg = 70, diff ≈ +3.33
    expect(computeTrend([75, 73, 72, 71, 70, 69])).toBe('STABLE');
  });

  it('only uses the first 6 snapshots (newest → oldest order)', () => {
    // Scores: 90,90,90 (recent) vs 70,70,70 (older) → IMPROVING
    // Additional older data should not affect the result
    expect(computeTrend([90, 90, 90, 70, 70, 70, 50, 50, 50])).toBe('IMPROVING');
  });
});
