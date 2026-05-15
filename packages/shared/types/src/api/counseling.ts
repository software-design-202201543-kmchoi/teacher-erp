import type { ICounselingRecord } from "../index.js";

export interface CounselingIdParams {
  recordId: string;
}

export interface ListCounselingQuery {
  from?: string;
  to?: string;
  keyword?: string;
}

export type ListCounselingResponse = ICounselingRecord[];

export interface CreateCounselingBody {
  counsel_date: string;
  content: string;
  next_plan?: string;
  is_shared: boolean;
}

export type CreateCounselingResponse = ICounselingRecord;

export interface UpdateCounselingBody {
  content?: string;
  next_plan?: string;
  is_shared?: boolean;
}

export type UpdateCounselingResponse = ICounselingRecord;
