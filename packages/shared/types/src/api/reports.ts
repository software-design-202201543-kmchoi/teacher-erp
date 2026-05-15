import type { ICounselingRecord, IFeedback, IGrade } from "../index.js";

export interface GradeReportTermSummary {
  term: string;
  grades: IGrade[];
  total: number;
  average: number;
  overallGrade: string;
  subjectCount: number;
}

export interface GradeReportResponse {
  student: {
    _id: string;
    name: string;
    grade_level: number;
    class_num: number;
  };
  termSummaries: GradeReportTermSummary[];
  allTimeAverage: number;
  totalSubjects: number;
  generatedAt: string;
}

export interface CounselingReportResponse {
  student: { _id: string; name: string };
  totalSessions: number;
  sharedSessions: number;
  records: ICounselingRecord[];
  generatedAt: string;
}

export interface FeedbackReportResponse {
  student: { _id: string; name: string };
  totalFeedbacks: number;
  byType: Record<string, number>;
  byVisibility: Record<string, number>;
  recentFeedbacks: IFeedback[];
  generatedAt: string;
}
