import { describe, it, expect } from 'vitest';
import {
  computeFillerScore,
  computePaceScore,
  computeCommunicationScore,
  computeOverallScore,
  roundScore,
} from '../modules/evaluation/scoring';

describe('computeFillerScore', () => {
  it('zero fillers → 100', () => expect(computeFillerScore(0)).toBe(100));
  it('10 fillers → 50', () => expect(computeFillerScore(10)).toBe(50));
  it('20 fillers → 0', () => expect(computeFillerScore(20)).toBe(0));
  it('25 fillers → 0 (clamped, not negative)', () => expect(computeFillerScore(25)).toBe(0));
});

describe('computePaceScore', () => {
  it('optimal flag set → 100 regardless of wpm', () => {
    expect(computePaceScore(130, true)).toBe(100);
    expect(computePaceScore(80, true)).toBe(100);
  });
  it('120 wpm not optimal → 125 (fast formula: 150/120 * 100)', () => {
    // At exactly 120 wpm the "fast" branch fires: (150/120)*100 = 125.
    // In practice FastAPI sets is_pace_optimal=true for 120-150 WPM so this
    // branch only fires for inconsistent FastAPI responses.
    expect(computePaceScore(120, false)).toBeCloseTo(125, 5);
  });
  it('60 wpm (under-pace) → 50', () => {
    expect(computePaceScore(60, false)).toBeCloseTo(50, 5);
  });
  it('150 wpm (fast boundary) → 100', () => {
    expect(computePaceScore(150, false)).toBe(100);
  });
  it('300 wpm (over-pace) → 50', () => {
    expect(computePaceScore(300, false)).toBeCloseTo(50, 5);
  });
});

describe('computeCommunicationScore', () => {
  it('all perfect scores → 100', () => {
    expect(
      computeCommunicationScore({ fluencyScore: 100, paceScore: 100, fillerScore: 100, clarityScore: 100 })
    ).toBe(100);
  });

  it('all zero → 0', () => {
    expect(
      computeCommunicationScore({ fluencyScore: 0, paceScore: 0, fillerScore: 0, clarityScore: 0 })
    ).toBe(0);
  });

  it('weights sum to 1.00 (0.35 + 0.25 + 0.20 + 0.20)', () => {
    // Each component 100 → result must be exactly 100
    const r = computeCommunicationScore({ fluencyScore: 100, paceScore: 100, fillerScore: 100, clarityScore: 100 });
    expect(r).toBe(100);
  });

  it('example calculation: fluency=80 pace=90 filler=70 clarity=60', () => {
    const expected = 80 * 0.35 + 90 * 0.25 + 70 * 0.20 + 60 * 0.20;
    expect(
      computeCommunicationScore({ fluencyScore: 80, paceScore: 90, fillerScore: 70, clarityScore: 60 })
    ).toBeCloseTo(expected, 10);
  });
});

describe('computeOverallScore', () => {
  it('70/30 weight: tech=80 comm=60 → 74', () => {
    expect(computeOverallScore(80, 60)).toBe(74);
  });
  it('perfect scores → 100', () => {
    expect(computeOverallScore(100, 100)).toBe(100);
  });
  it('zero scores → 0', () => {
    expect(computeOverallScore(0, 0)).toBe(0);
  });
});

describe('roundScore', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundScore(74.555)).toBe(74.56);
    expect(roundScore(100)).toBe(100);
    expect(roundScore(0.001)).toBe(0);
  });
});
