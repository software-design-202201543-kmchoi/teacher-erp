import type { IGrade } from "../index.js";

export interface GradeIdParams {
  gradeId: string;
}

export type ListGradesResponse = IGrade[];

export interface CreateGradeBody {
  subject_id: string;
  term: string;
  score: number;
}

export type CreateGradeResponse = IGrade;

export interface UpdateGradeBody {
  score?: number;
}

export type UpdateGradeResponse = IGrade;
