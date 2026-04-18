import { Navigate, Route, Routes } from "react-router-dom"
import { AppShell } from "@/components/AppShell"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { useAuth } from "@/hooks/useAuth"
import { DashboardPage } from "@/pages/DashboardPage"
import { LoginPage } from "@/pages/LoginPage"
import { ForbiddenPage } from "@/pages/ForbiddenPage"
import { StudentsPage } from "@/pages/StudentsPage"
import { StudentDetailPage } from "@/pages/StudentDetailPage"
import { GradesPage } from "@/pages/GradesPage"
import { FeedbackPage } from "@/pages/FeedbackPage"
import { CounselingPage } from "@/pages/CounselingPage"
import { NotificationsPage } from "@/pages/NotificationsPage"

export function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-2xl items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">세션 상태를 확인하는 중입니다...</p>
      </main>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* 인증 필요 라우트 — AppShell로 래핑 */}
      <Route
        path="/"
        element={isAuthenticated ? <AppShell><DashboardPage /></AppShell> : <Navigate to="/login" replace />}
      />
      <Route
        path="/students"
        element={
          <AppShell>
            <ProtectedRoute action="read" subject="Student" subjectData={{ _id: "__list__" }}>
              <StudentsPage />
            </ProtectedRoute>
          </AppShell>
        }
      />
      <Route path="/students/:id" element={<AppShell><StudentDetailPage /></AppShell>} />
      <Route path="/students/:id/grades" element={<AppShell><GradesPage /></AppShell>} />
      <Route path="/students/:id/feedback" element={<AppShell><FeedbackPage /></AppShell>} />
      <Route path="/students/:id/counseling" element={<AppShell><CounselingPage /></AppShell>} />
      <Route
        path="/notifications"
        element={<AppShell><NotificationsPage /></AppShell>}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
