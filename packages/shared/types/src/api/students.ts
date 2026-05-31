import type { IAcademicRecord, IStudentUser, IParentUser } from "../index.js";

export interface StudentIdParams {
  id: string;
}

export interface ListStudentsResponse {
  students: IStudentUser[];
}

export interface GetStudentResponse {
  student: IStudentUser;
}

export interface AcademicRecordResponse {
  academicRecord: IAcademicRecord;
}

export interface UpdateAcademicRecordBody {
  attendance_info?: {
    absences?: number;
    tardies?: number;
    earlyLeaves?: number;
  };
  special_notes?: string;
}

export interface BatchStudentInput {
  name: string;
  grade_level: number;
  class_num: number;
  student_num: number;
  email?: string;
  password?: string;
  parent_name?: string;
  parent_email?: string;
}

export interface BatchCreatedParent {
  user: IParentUser;
  tempPassword: string;
  isNew: boolean;
}

export interface BatchCreatedResult {
  student: IStudentUser;
  tempPassword: string;
  parent?: BatchCreatedParent;
}

export interface ParentLinkInput {
  email: string;
  name?: string;
}

export interface ParentLinkResult {
  parent: IParentUser;
  tempPassword: string;
  isNew: boolean;
}

export interface BatchFailedResult {
  input: BatchStudentInput;
  reason: string;
}

export interface BatchCreateResponse {
  created: BatchCreatedResult[];
  failed: BatchFailedResult[];
}
