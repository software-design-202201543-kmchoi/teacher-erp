import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import type { Actions, Subjects } from "@teacher-erp/shared-utils"
import type { ReactNode } from "react"

interface ProtectedRouteProps {
  action: Actions
  subject: Subjects
  subjectData?: Record<string, unknown>
  children: ReactNode
}

export function ProtectedRoute({ action, subject, subjectData, children }: ProtectedRouteProps) {
  const { ability, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const target = subjectData ? { __t: subject, ...subjectData } : subject
  const canAccess = ability.can(action, target as never)

  if (!canAccess) {
    return <Navigate to="/forbidden" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}