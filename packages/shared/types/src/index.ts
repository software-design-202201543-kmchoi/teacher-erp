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
  subjects_taught: string[];
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

export interface ISubject {
  _id: string;
  name: string;
  teacher_id: string;
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
  calculated_grade: string;
  createdAt: Date;
  updatedAt: Date;
}

export type FeedbackType = '성적' | '행동' | '출결' | '태도';
export type FeedbackVisibility = 'PRIVATE' | 'STUDENT' | 'PARENT' | 'ALL';

export interface IFeedback {
  _id: string;
  student_id: string;
  teacher_id: string;
  type: FeedbackType;
  content: string;
  visibility: FeedbackVisibility;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICounselingRecord {
  _id: string;
  student_id: string;
  teacher_id: string;
  counsel_date: string;
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
