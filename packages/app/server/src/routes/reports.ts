import { Router } from "express";
import type { RequestHandler } from "express";
import {
  demoGradesByStudentId,
  demoFeedbackByStudentId,
  demoCounselingByStudentId,
  demoUsersById,
  calcAverage,
  calcGrade,
} from "@teacher-erp/shared-utils";
import type {
  ApiErrorResponse,
  CounselingReportResponse,
  FeedbackReportResponse,
  GradeReportResponse,
  GradeReportTermSummary,
  IStudentUser,
  StudentScopedParams,
} from "@teacher-erp/shared-types";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// GET /api/reports/student/:studentId/grades
// 학생 성적 분석 보고서 JSON — TEACHER 전용
const getGradeReport: RequestHandler<
  StudentScopedParams,
  GradeReportResponse | ApiErrorResponse
> = (req, res) => {
  const user = req.authUser!;
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const { studentId } = req.params;
  const student = demoUsersById[studentId] as IStudentUser | undefined;
  if (!student || student.role !== "STUDENT") {
    res.status(404).json({ message: "Student not found" });
    return;
  }

  const grades = demoGradesByStudentId[studentId] ?? [];

  // 학기별 그룹
  const byTerm = grades.reduce<Record<string, typeof grades>>((acc, g) => {
    const termGrades = (acc[g.term] ??= []);
    termGrades.push(g);
    return acc;
  }, {});

  const termSummaries: GradeReportTermSummary[] = Object.entries(byTerm).map(
    ([term, termGrades]) => {
      const scores = termGrades.map((g) => g.score);
      const average = calcAverage(scores);
      return {
        term,
        grades: termGrades,
        total: scores.reduce((a, b) => a + b, 0),
        average,
        overallGrade: calcGrade(average),
        subjectCount: termGrades.length,
      };
    },
  );

  res.json({
    student: {
      _id: student._id,
      name: student.name,
      grade_level: student.grade_level,
      class_num: student.class_num,
    },
    termSummaries,
    allTimeAverage: calcAverage(grades.map((g) => g.score)),
    totalSubjects: new Set(grades.map((g) => g.subject_id)).size,
    generatedAt: new Date().toISOString(),
  });
};

router.get("/student/:studentId/grades", authenticate, getGradeReport);

// GET /api/reports/student/:studentId/counseling
// 상담 내역 보고서 JSON — TEACHER 전용
const getCounselingReport: RequestHandler<
  StudentScopedParams,
  CounselingReportResponse | ApiErrorResponse
> = (req, res) => {
  const user = req.authUser!;
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const { studentId } = req.params;
  const student = demoUsersById[studentId] as IStudentUser | undefined;
  if (!student || student.role !== "STUDENT") {
    res.status(404).json({ message: "Student not found" });
    return;
  }

  const records = (demoCounselingByStudentId[studentId] ?? [])
    .filter((r) => r.is_shared || r.teacher_id === user._id)
    .sort(
      (a, b) =>
        new Date(a.counsel_date).getTime() -
        new Date(b.counsel_date).getTime(),
    );

  res.json({
    student: { _id: student._id, name: student.name },
    totalSessions: records.length,
    sharedSessions: records.filter((r) => r.is_shared).length,
    records,
    generatedAt: new Date().toISOString(),
  });
};

router.get("/student/:studentId/counseling", authenticate, getCounselingReport);

// GET /api/reports/student/:studentId/feedback
// 피드백 요약 보고서 JSON — TEACHER 전용
const getFeedbackReport: RequestHandler<
  StudentScopedParams,
  FeedbackReportResponse | ApiErrorResponse
> = (req, res) => {
  const user = req.authUser!;
  if (user.role !== "TEACHER") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const { studentId } = req.params;
  const student = demoUsersById[studentId] as IStudentUser | undefined;
  if (!student || student.role !== "STUDENT") {
    res.status(404).json({ message: "Student not found" });
    return;
  }

  const feedbacks = demoFeedbackByStudentId[studentId] ?? [];
  const byType = feedbacks.reduce<Record<string, number>>((acc, f) => {
    acc[f.type] = (acc[f.type] ?? 0) + 1;
    return acc;
  }, {});
  const byVisibility = feedbacks.reduce<Record<string, number>>((acc, f) => {
    acc[f.visibility] = (acc[f.visibility] ?? 0) + 1;
    return acc;
  }, {});

  res.json({
    student: { _id: student._id, name: student.name },
    totalFeedbacks: feedbacks.length,
    byType,
    byVisibility,
    recentFeedbacks: feedbacks.slice(-5),
    generatedAt: new Date().toISOString(),
  });
};

router.get("/student/:studentId/feedback", authenticate, getFeedbackReport);

export default router;
