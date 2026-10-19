/**
 * Gamification & Retention Engine: Streaks & Badges
 * Complies with SPEC-QUIZLET-RE-2026-V1 Section 4.6 & AC-STK-01
 */

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  freezeAvailable: number;
  freezeUsedDates: string[];
  unlockedBadgeIds: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const SYSTEM_BADGES: Badge[] = [
  {
    id: 'streak_3',
    name: 'Khởi đầu kiên định',
    description: 'Học 3 ngày liên tục',
    icon: '🔥',
  },
  {
    id: 'streak_7',
    name: 'Chiến binh 1 tuần',
    description: 'Học 7 ngày liên tục',
    icon: '⚡',
  },
  {
    id: 'streak_30',
    name: 'Học giả 1 tháng',
    description: 'Học 30 ngày liên tục',
    icon: '🏆',
  },
  {
    id: 'night_owl',
    name: 'Cú đêm',
    description: 'Hoàn thành phiên học sau 22h',
    icon: '🦉',
  },
];

export class StreaksEngine {
  private readonly state: StreakState;

  constructor(initialState?: Partial<StreakState>) {
    this.state = {
      currentStreak: initialState?.currentStreak || 0,
      longestStreak: initialState?.longestStreak || 0,
      lastActiveDate: initialState?.lastActiveDate || '',
      freezeAvailable: initialState?.freezeAvailable ?? 1,
      freezeUsedDates: initialState?.freezeUsedDates || [],
      unlockedBadgeIds: initialState?.unlockedBadgeIds || [],
    };
  }

  public getState(): StreakState {
    return { ...this.state };
  }

  public recordStudyActivity(now = new Date()): {
    streakUpdated: boolean;
    newBadges: Badge[];
  } {
    const todayStr = this.formatDate(now);
    const newBadges: Badge[] = [];

    // Already recorded today
    if (this.state.lastActiveDate === todayStr) {
      return { streakUpdated: false, newBadges: [] };
    }

    if (!this.state.lastActiveDate) {
      // First day ever
      this.state.currentStreak = 1;
    } else {
      const lastDate = new Date(this.state.lastActiveDate);
      const diffDays = Math.floor(
        (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        // Consecutive day
        this.state.currentStreak += 1;
      } else if (diffDays === 2 && this.state.freezeAvailable > 0) {
        // Missed 1 day -> use Streak Freeze (AC-STK-01)
        this.state.freezeAvailable -= 1;
        const missedDateStr = this.formatDate(
          new Date(now.getTime() - 1000 * 60 * 60 * 24)
        );
        this.state.freezeUsedDates.push(missedDateStr);
        this.state.currentStreak += 1; // Preserve and increment
      } else if (diffDays > 1) {
        // Broken streak without freeze
        this.state.currentStreak = 1;
      }
    }

    this.state.lastActiveDate = todayStr;
    if (this.state.currentStreak > this.state.longestStreak) {
      this.state.longestStreak = this.state.currentStreak;
    }

    // Check Night Owl badge (after 22:00)
    if (
      now.getHours() >= 22 &&
      !this.state.unlockedBadgeIds.includes('night_owl')
    ) {
      this.state.unlockedBadgeIds.push('night_owl');
      const badge = SYSTEM_BADGES.find(b => b.id === 'night_owl');
      if (badge) newBadges.push(badge);
    }

    // Check streak milestones
    [3, 7, 30].forEach(days => {
      const badgeId = `streak_${days}`;
      if (
        this.state.currentStreak >= days &&
        !this.state.unlockedBadgeIds.includes(badgeId)
      ) {
        this.state.unlockedBadgeIds.push(badgeId);
        const badge = SYSTEM_BADGES.find(b => b.id === badgeId);
        if (badge) newBadges.push(badge);
      }
    });

    return { streakUpdated: true, newBadges };
  }

  private formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
