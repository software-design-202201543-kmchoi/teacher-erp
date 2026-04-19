import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { defineAbilityFor, type AppAbility } from "@teacher-erp/shared-utils"
import type { IUser } from "@teacher-erp/shared-types"
import { getSession, loginByRole, logout, type LoginRole } from "@/lib/api"

interface AuthContextValue {
  user: IUser | null
  ability: AppAbility
  isAuthenticated: boolean
  isLoading: boolean
  login: (role: LoginRole, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const guestAbility = defineAbilityFor({
  _id: "guest",
  email: "guest@local",
  name: "Guest",
  role: "STUDENT",
  grade_level: 0,
  class_num: 0,
  student_num: 0,
  createdAt: new Date(0),
  updatedAt: new Date(0),
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const ability = useMemo(() => (user ? defineAbilityFor(user) : guestAbility), [user])

  useEffect(() => {
    let isMounted = true

    getSession()
      .then((session) => {
        if (isMounted) {
          setUser(session.user)
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (role: LoginRole, email: string, password: string) => {
    const session = await loginByRole(role, email, password)
    setUser(session.user)
  }, [])

  const logoutAndClear = useCallback(async () => {
    await logout().catch(() => undefined)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ability,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout: logoutAndClear,
    }),
    [ability, isLoading, login, logoutAndClear, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider")
  }

  return context
}