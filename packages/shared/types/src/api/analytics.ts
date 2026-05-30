export interface SubjectScore {
  subject_id: string;
  subject_name: string;
  score: number;
  grade: string;
}

export interface StudentLearningSnapshot {
  student_id: string;
  term: string;
  avg_score: number;
  overall_grade: string;
  subject_scores: SubjectScore[];
  attendance_summary: string;
  feedback_count: number;
  counseling_count: number;
  snapshot_at: string;
}

export interface ScoreHistoryEntry {
  term: string;
  score: number;
  grade: string;
}

export type Trend = 'UP' | 'DOWN' | 'STABLE';

export interface SubjectProgressSummary {
  student_id: string;
  subject_id: string;
  score_history: ScoreHistoryEntry[];
  avg_score: number;
  trend: Trend;
  last_updated_at: string;
}
