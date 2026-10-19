/**
 * Classroom Progress Analytics & LTI Integration Service
 * Complies with SPEC-QUIZLET-RE-2026-V1 Section 4.5 & Section 8
 */

export interface StudentProgressRecord {
  studentId: string;
  studentName: string;
  flashcardsCompleted: boolean;
  learnModeCompleted: boolean;
  testScorePercent: number; // 0..100
  incorrectCardIds: string[];
}

export interface ClassroomModel {
  id: string;
  name: string;
  joinCode: string;
  studySetIds: string[];
  students: StudentProgressRecord[];
}

export interface MostMissedAnalysis {
  cardId: string;
  missedCount: number;
  missRatePercent: number;
}

export class ClassroomAnalyticsService {
  private readonly classrooms: Map<string, ClassroomModel> = new Map();

  public createClassroom(name: string): ClassroomModel {
    const id = `class_${Date.now()}`;
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const classroom: ClassroomModel = {
      id,
      name,
      joinCode,
      studySetIds: [],
      students: [],
    };
    this.classrooms.set(id, classroom);
    return classroom;
  }

  public recordStudentProgress(
    classId: string,
    record: StudentProgressRecord
  ): void {
    const classroom = this.classrooms.get(classId);
    if (!classroom) {
      throw new Error(`Classroom not found: ${classId}`);
    }

    const existingIdx = classroom.students.findIndex(
      s => s.studentId === record.studentId
    );
    if (existingIdx >= 0) {
      classroom.students[existingIdx] = record;
    } else {
      classroom.students.push(record);
    }
  }

  public getAnalytics(classId: string): {
    totalStudents: number;
    flashcardsCompletionRate: number;
    learnModeCompletionRate: number;
    averageTestScore: number;
    mostMissedCards: MostMissedAnalysis[];
  } {
    const classroom = this.classrooms.get(classId);
    if (!classroom) {
      throw new Error(`Classroom not found: ${classId}`);
    }

    const totalStudents = classroom.students.length;
    if (totalStudents === 0) {
      return {
        totalStudents: 0,
        flashcardsCompletionRate: 0,
        learnModeCompletionRate: 0,
        averageTestScore: 0,
        mostMissedCards: [],
      };
    }

    const flashcardsDone = classroom.students.filter(
      s => s.flashcardsCompleted
    ).length;
    const learnDone = classroom.students.filter(
      s => s.learnModeCompleted
    ).length;
    const totalScore = classroom.students.reduce(
      (acc, s) => acc + s.testScorePercent,
      0
    );

    // Aggregate missed cards
    const missedMap = new Map<string, number>();
    classroom.students.forEach(s => {
      s.incorrectCardIds.forEach(cardId => {
        missedMap.set(cardId, (missedMap.get(cardId) || 0) + 1);
      });
    });

    const mostMissedCards: MostMissedAnalysis[] = Array.from(
      missedMap.entries()
    )
      .map(([cardId, count]) => ({
        cardId,
        missedCount: count,
        missRatePercent: Math.round((count / totalStudents) * 100),
      }))
      .sort((a, b) => b.missedCount - a.missedCount);

    return {
      totalStudents,
      flashcardsCompletionRate: Math.round(
        (flashcardsDone / totalStudents) * 100
      ),
      learnModeCompletionRate: Math.round((learnDone / totalStudents) * 100),
      averageTestScore: Math.round(totalScore / totalStudents),
      mostMissedCards,
    };
  }

  public generateLtiScorePayload(
    studentId: string,
    scorePercent: number,
    resourceLinkId: string
  ) {
    return {
      timestamp: new Date().toISOString(),
      scoreGiven: scorePercent / 100, // normalized 0.0 - 1.0 for LTI 1.3
      scoreMaximum: 1.0,
      comment: `Completed Quizlet Assessment in Aevum with score: ${scorePercent}%`,
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
      userId: studentId,
      resourceLinkId,
    };
  }
}
