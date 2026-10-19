import { describe, expect, it } from 'vitest';

import { StreaksEngine } from '../services/streaks.engine';

describe('StreaksEngine (AC-STK-01)', () => {
  it('should initialize with 0 streak and increment on first activity', () => {
    const engine = new StreaksEngine();
    const res = engine.recordStudyActivity(new Date('2026-10-15T10:00:00Z'));

    expect(res.streakUpdated).toBe(true);
    expect(engine.getState().currentStreak).toBe(1);
    expect(engine.getState().longestStreak).toBe(1);
  });

  it('should increment streak on consecutive days', () => {
    const engine = new StreaksEngine({
      currentStreak: 1,
      lastActiveDate: '2026-10-15',
    });

    const res = engine.recordStudyActivity(new Date('2026-10-16T10:00:00Z'));
    expect(res.streakUpdated).toBe(true);
    expect(engine.getState().currentStreak).toBe(2);
  });

  it('should use Streak Freeze when 1 day is missed (AC-STK-01)', () => {
    const engine = new StreaksEngine({
      currentStreak: 5,
      lastActiveDate: '2026-10-15',
      freezeAvailable: 1,
    });

    // Missed 2026-10-16, studied on 2026-10-17
    const res = engine.recordStudyActivity(new Date('2026-10-17T10:00:00Z'));
    expect(res.streakUpdated).toBe(true);

    const state = engine.getState();
    expect(state.currentStreak).toBe(6); // Preserved & incremented
    expect(state.freezeAvailable).toBe(0); // Freeze consumed
    expect(state.freezeUsedDates).toContain('2026-10-16');
  });

  it('should unlock Night Owl badge when studying after 22h', () => {
    const engine = new StreaksEngine();
    const lateNightDate = new Date('2026-10-15T23:15:00'); // 23h15

    const res = engine.recordStudyActivity(lateNightDate);
    expect(res.newBadges.some(b => b.id === 'night_owl')).toBe(true);
    expect(engine.getState().unlockedBadgeIds).toContain('night_owl');
  });
});
