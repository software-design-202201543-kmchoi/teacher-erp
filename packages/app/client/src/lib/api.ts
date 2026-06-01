import type { IUser, IStudentUser, IAcademicRecord, IGrade, IFeedback, ICounselingRecord, INotification } from "@teacher-erp/shared-types"
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

export async function getStudents(): Promise<{ students: IStudentUser[] }> {
  return request<{ students: IStudentUser[] }>("/api/students")
}

export async function getStudent(id: string): Promise<IStudentUser> {
  const data = await request<{ student: IStudentUser }>(`/api/students/${id}`)
  return data.student
}

export async function getAcademicRecord(studentId: string): Promise<IAcademicRecord> {
  const data = await request<{ academicRecord: IAcademicRecord }>(`/api/students/${studentId}/academic-record`)
  return data.academicRecord
}

export async function updateAcademicRecord(
  studentId: string,
  data: {
    attendance_info?: { absences?: number; tardies?: number; earlyLeaves?: number }
    special_notes?: string
  }
): Promise<IAcademicRecord> {
  const result = await request<{ academicRecord: IAcademicRecord }>(`/api/students/${studentId}/academic-record`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
  return result.academicRecord
}

// --- Grades ---
export async function getGrades(studentId: string): Promise<IGrade[]> {
  return request<IGrade[]>(`/api/grades/by-student/${studentId}`)
}

export async function createGrade(
  studentId: string,
  data: { subject_id: string; term: string; score: number }
): Promise<IGrade> {
  return request<IGrade>(`/api/grades/by-student/${studentId}`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateGrade(gradeId: string, data: { score: number }): Promise<IGrade> {
  return request<IGrade>(`/api/grades/${gradeId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteGrade(gradeId: string): Promise<void> {
  return request<void>(`/api/grades/${gradeId}`, { method: "DELETE" })
}

// --- Feedback ---
export async function getFeedback(studentId: string): Promise<IFeedback[]> {
  return request<IFeedback[]>(`/api/feedback/by-student/${studentId}`)
}

export async function createFeedback(
  studentId: string,
  data: { type: string; content: string; visibility: string }
): Promise<IFeedback> {
  return request<IFeedback>(`/api/feedback/by-student/${studentId}`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateFeedback(
  feedbackId: string,
  data: { type?: string; content?: string; visibility?: string }
): Promise<IFeedback> {
  return request<IFeedback>(`/api/feedback/${feedbackId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteFeedback(feedbackId: string): Promise<void> {
  return request<void>(`/api/feedback/${feedbackId}`, { method: "DELETE" })
}

// --- Counseling ---
export async function getCounseling(
  studentId: string,
  params?: { from?: string; to?: string; keyword?: string }
): Promise<ICounselingRecord[]> {
  const qs = params
    ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null) as [string, string][]).toString()
    : ""
  return request<ICounselingRecord[]>(`/api/counseling/by-student/${studentId}${qs}`)
}

export async function createCounseling(
  studentId: string,
  data: { counsel_date: string; content: string; next_plan?: string; is_shared: boolean }
): Promise<ICounselingRecord> {
  return request<ICounselingRecord>(`/api/counseling/by-student/${studentId}`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function updateCounseling(
  recordId: string,
  data: { content?: string; next_plan?: string; is_shared?: boolean }
): Promise<ICounselingRecord> {
  return request<ICounselingRecord>(`/api/counseling/${recordId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteCounseling(recordId: string): Promise<void> {
  return request<void>(`/api/counseling/${recordId}`, { method: "DELETE" })
}

// --- Students (batch) ---
export async function batchCreateStudents(
  students: import("@teacher-erp/shared-types").BatchStudentInput[]
): Promise<import("@teacher-erp/shared-types").BatchCreateResponse> {
  return request<import("@teacher-erp/shared-types").BatchCreateResponse>(
    "/api/students/batch",
    { method: "POST", body: JSON.stringify({ students }) }
  )
}

// --- Notifications ---
export async function getNotifications(): Promise<INotification[]> {
  return request<INotification[]>("/api/notifications")
}

export async function markNotificationRead(id: string): Promise<INotification> {
  return request<INotification>(`/api/notifications/${id}/read`, { method: "POST" })
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/notifications/read-all", { method: "POST" })
}

// --- Parents ---
export async function getStudentParents(
  studentId: string
): Promise<{ parents: import("@teacher-erp/shared-types").IParentUser[] }> {
  return request(`/api/students/${studentId}/parents`)
}

export async function linkParent(
  studentId: string,
  data: import("@teacher-erp/shared-types").ParentLinkInput
): Promise<import("@teacher-erp/shared-types").ParentLinkResult> {
  return request(`/api/students/${studentId}/parents`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function unlinkParent(studentId: string, parentId: string): Promise<void> {
  return request(`/api/students/${studentId}/parents/${parentId}`, { method: "DELETE" })
}

// --- Reports ---
export async function getGradeReport(
  studentId: string
): Promise<import("@teacher-erp/shared-types").GradeReportResponse> {
  return request<import("@teacher-erp/shared-types").GradeReportResponse>(
    `/api/reports/student/${studentId}/grades`
  )
}

export async function getCounselingReport(
  studentId: string
): Promise<import("@teacher-erp/shared-types").CounselingReportResponse> {
  return request<import("@teacher-erp/shared-types").CounselingReportResponse>(
    `/api/reports/student/${studentId}/counseling`
  )
}

export async function getFeedbackReport(
  studentId: string
): Promise<import("@teacher-erp/shared-types").FeedbackReportResponse> {
  return request<import("@teacher-erp/shared-types").FeedbackReportResponse>(
    `/api/reports/student/${studentId}/feedback`
  )
}

// --- AI Chatbot ---
export async function sendChatMessage(
  studentId: string,
  message: string
): Promise<{ reply: string }> {
  return request<{ reply: string }>(`/api/analytics/students/${studentId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  })
}

// --- Analytics ---
export async function getAnalyticsSnapshot(
  studentId: string,
  term: string
): Promise<import("@teacher-erp/shared-types").StudentLearningSnapshot> {
  return request<import("@teacher-erp/shared-types").StudentLearningSnapshot>(
    `/api/analytics/students/${studentId}/snapshot?term=${encodeURIComponent(term)}`
  )
}

export async function getAnalyticsAllSnapshots(
  studentId: string
): Promise<import("@teacher-erp/shared-types").StudentLearningSnapshot[]> {
  return request<import("@teacher-erp/shared-types").StudentLearningSnapshot[]>(
    `/api/analytics/students/${studentId}/snapshot`
  )
}

export async function getAnalyticsSubjectProgress(
  studentId: string
): Promise<import("@teacher-erp/shared-types").SubjectProgressSummary[]> {
  return request<import("@teacher-erp/shared-types").SubjectProgressSummary[]>(
    `/api/analytics/students/${studentId}/subject-progress`
  )
}

// --- Integrated Search ---
export async function searchIntegrated(params: {
  q?: string
  subject?: string
  from?: string
  to?: string
  types?: string[]
  page?: number
  page_size?: number
}): Promise<import("@teacher-erp/shared-types").IntegratedSearchResponse> {
  const query = new URLSearchParams()
  if (params.q) query.set("q", params.q)
  if (params.subject) query.set("subject", params.subject)
  if (params.from) query.set("from", params.from)
  if (params.to) query.set("to", params.to)
  if (params.types && params.types.length > 0) query.set("types", params.types.join(","))
  if (params.page) query.set("page", String(params.page))
  if (params.page_size) query.set("page_size", String(params.page_size))

  return request<import("@teacher-erp/shared-types").IntegratedSearchResponse>(
    `/api/search?${query.toString()}`
  )
}

// --- Admin ---
export async function adminGetUsers(params?: { role?: string; page?: number; limit?: number }): Promise<import("@teacher-erp/shared-types").AdminUserListResponse> {
  const qs = params ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : ""
  return request<import("@teacher-erp/shared-types").AdminUserListResponse>(`/api/admin/users${qs}`)
}

export async function adminCreateUser(body: import("@teacher-erp/shared-types").CreateUserInput): Promise<import("@teacher-erp/shared-types").AdminUserResponse> {
  return request<import("@teacher-erp/shared-types").AdminUserResponse>("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

export async function adminUpdateUser(id: string, body: import("@teacher-erp/shared-types").UpdateUserInput): Promise<import("@teacher-erp/shared-types").AdminUserResponse> {
  return request<import("@teacher-erp/shared-types").AdminUserResponse>(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

export async function adminDeleteUser(id: string): Promise<void> {
  await request<void>(`/api/admin/users/${id}`, { method: "DELETE" })
}

export async function adminAddParentLink(parentId: string, studentId: string): Promise<void> {
  await request<void>(`/api/admin/users/${parentId}/parent-links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId }),
  })
}

export async function adminRemoveParentLink(parentId: string, studentId: string): Promise<void> {
  await request<void>(`/api/admin/users/${parentId}/parent-links/${studentId}`, { method: "DELETE" })
}

// --- Audit Log ---
export async function getAuditLog(
  studentId: string,
  params?: { collection?: string; limit?: number }
): Promise<import("@teacher-erp/shared-types").AuditLogListResponse> {
  const qs = params
    ? "?" + new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      ).toString()
    : ""
  return request<import("@teacher-erp/shared-types").AuditLogListResponse>(
    `/api/audit/student/${studentId}${qs}`
  )
}
