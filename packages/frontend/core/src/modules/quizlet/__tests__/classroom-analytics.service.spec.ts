import { describe, expect, it } from 'vitest';

import { ClassroomAnalyticsService } from '../services/classroom-analytics.service';

describe('ClassroomAnalyticsService (Teacher & LMS Integration)', () => {
  it('should create classroom with 6-char alphanumeric join code', () => {
    const service = new ClassroomAnalyticsService();
    const classroom = service.createClassroom('Lớp 12A1');

    expect(classroom.id).toBeDefined();
    expect(classroom.name).toBe('Lớp 12A1');
    expect(classroom.joinCode.length).toBe(6);
  });

  it('should compute completion rates and most missed questions across students', () => {
    const service = new ClassroomAnalyticsService();
    const classroom = service.createClassroom('Toán Cao Cấp');

    service.recordStudentProgress(classroom.id, {
      studentId: 's1',
      studentName: 'Nguyen Van A',
      flashcardsCompleted: true,
      learnModeCompleted: true,
      testScorePercent: 90,
      incorrectCardIds: ['card_hard_1'],
    });

    service.recordStudentProgress(classroom.id, {
      studentId: 's2',
      studentName: 'Tran Thi B',
      flashcardsCompleted: true,
      learnModeCompleted: false,
      testScorePercent: 70,
      incorrectCardIds: ['card_hard_1', 'card_hard_2'],
    });

    const analytics = service.getAnalytics(classroom.id);
    expect(analytics.totalStudents).toBe(2);
    expect(analytics.flashcardsCompletionRate).toBe(100); // 2/2
    expect(analytics.learnModeCompletionRate).toBe(50); // 1/2
    expect(analytics.averageTestScore).toBe(80); // (90+70)/2
    expect(analytics.mostMissedCards[0].cardId).toBe('card_hard_1');
    expect(analytics.mostMissedCards[0].missedCount).toBe(2);
    expect(analytics.mostMissedCards[0].missRatePercent).toBe(100);
  });

  it('should generate valid LTI 1.3 grade passback payload', () => {
    const service = new ClassroomAnalyticsService();
    const payload = service.generateLtiScorePayload(
      'student_123',
      85,
      'res_link_abc'
    );

    expect(payload.userId).toBe('student_123');
    expect(payload.scoreGiven).toBe(0.85);
    expect(payload.scoreMaximum).toBe(1.0);
    expect(payload.activityProgress).toBe('Completed');
    expect(payload.gradingProgress).toBe('FullyGraded');
  });
});
