import type { IAcademicRecord, IStudentUser } from "../index.js";

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
