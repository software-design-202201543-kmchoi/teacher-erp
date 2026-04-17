import { Navigate, Route, Routes } from "react-router-dom"
import { DashboardPage } from "@/pages/DashboardPage"
import { LoginPage } from "@/pages/LoginPage"
import { ForbiddenPage } from "@/pages/ForbiddenPage"

import { useAuth } from "@/hooks/useAuth"

export function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-2xl items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">
          세션 상태를 확인하는 중입니다...
        </p>
      </main>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? <DashboardPage /> : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
