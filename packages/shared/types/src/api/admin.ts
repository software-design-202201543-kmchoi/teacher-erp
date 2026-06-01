import type { IUser, Role } from "../index.js";

export interface AdminUserListResponse {
  users: IUser[];
  total: number;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: Role;
  password: string;
  // STUDENT
  grade_level?: number;
  class_num?: number;
  student_num?: number;
  // TEACHER
  subjects_taught?: string[];
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  // STUDENT
  grade_level?: number;
  class_num?: number;
  student_num?: number;
  // TEACHER
  subjects_taught?: string[];
}

export interface ParentLinkAdminInput {
  studentId: string;
}

export interface AdminUserResponse {
  user: IUser;
}
