export type Role = 'TEACHER' | 'STUDENT' | 'PARENT';

export interface IBaseUser {
  _id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeacherUser extends IBaseUser {
  role: 'TEACHER';
  subjectsTaught: string[];
  homeroom?: { grade: number; classId: number };
}

export interface IStudentUser extends IBaseUser {
  role: 'STUDENT';
  grade: number;
  classId: number;
  studentNumber: number;
}

export interface IParentUser extends IBaseUser {
  role: 'PARENT';
  children: string[];
}

export type IUser = ITeacherUser | IStudentUser | IParentUser;

export interface IAcademicRecord {
  _id: string;
  studentId: string;
  attendance_info: {
    absences: number;
    tardies: number;
    earlyLeaves: number;
  };
  special_notes: string;
  createdAt: Date;
  updatedAt: Date;
}
