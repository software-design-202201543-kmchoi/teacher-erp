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
  subject?: string;
  subjectsTaught: string[];
  homeroom?: { grade_level: number; class_num: number };
}

export interface IStudentUser extends IBaseUser {
  role: 'STUDENT';
  grade_level: number;
  class_num: number;
  student_num: number;
}

export interface IParentUser extends IBaseUser {
  role: 'PARENT';
  phone_number?: string;
  children: string[];
}

export type IUser = ITeacherUser | IStudentUser | IParentUser;

export interface IAcademicRecord {
  _id: string;
  student_id: string;
  attendance_info?: string;
  special_notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISubject {
  _id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGrade {
  _id: string;
  student_id: string;
  subject_id: string;
  teacher_id: string;
  term: string;
  score: number;
  calculated_grade?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFeedback {
  _id: string;
  student_id: string;
  teacher_id: string;
  type: '성적' | '행동' | '출결' | '태도';
  content: string;
  visibility: 'PRIVATE' | 'STUDENT' | 'PARENT' | 'ALL';
  createdAt: Date;
  updatedAt: Date;
}

export interface ICounselingRecord {
  _id: string;
  student_id: string;
  teacher_id: string;
  counsel_date: Date;
  content: string;
  next_plan?: string;
  is_shared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification {
  _id: string;
  user_id: string;
  title: string;
  content: string;
  is_read: boolean;
  createdAt: Date;
  updatedAt: Date;
}
