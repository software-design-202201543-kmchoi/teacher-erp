import type { IUser } from "../index.js";

export type LoginRoleParam = "student" | "teacher" | "parent";

export interface LoginParams {
  role: LoginRoleParam;
}

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface SessionPayload {
  user: IUser;
  rules: unknown[];
}

export interface LoginResponse extends SessionPayload {
  expiresInSeconds: number;
}

export type MeResponse = SessionPayload;
