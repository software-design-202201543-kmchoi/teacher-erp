import type { IUser } from "@teacher-erp/shared-types"
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001"

export type LoginRole = "student" | "teacher" | "parent"

export interface SessionResponse {
  user: IUser
  rules: unknown[]
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {})
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    const message =
      typeof errorBody?.message === "string"
        ? errorBody.message
        : `Request failed with status ${response.status}`
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function loginByRole(
  role: LoginRole,
  email: string,
  password: string
) {
  return request<SessionResponse>(`/api/auth/login/${role}`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

export async function getSession() {
  return request<SessionResponse>("/api/auth/me")
}

export async function logout() {
  return request<void>("/api/auth/logout", {
    method: "POST",
  })
}
