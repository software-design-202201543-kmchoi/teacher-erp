import { Router } from "express"
import type { RequestHandler } from "express"
import { defineAbilityFor, demoUsersById } from "@teacher-erp/shared-utils"
import type {
  ApiErrorResponse,
  LoginParams,
  LoginRequestBody,
  LoginResponse,
  LoginRoleParam,
  MeResponse,
  Role,
} from "@teacher-erp/shared-types"
import { demoAuthAccounts } from "../data/authAccounts.js"
import { authenticate } from "../middleware/authenticate.js"
import {
  clearAccessTokenCookie,
  getAccessTokenExpiresInSeconds,
  signAccessToken,
  writeAccessTokenCookie,
} from "../utils/authToken.js"
import { writeSecurityEvent } from "../utils/securityEvent.js"

const router = Router()

const roleParamToRole: Record<LoginRoleParam, Role> = {
  student: "STUDENT",
  teacher: "TEACHER",
  parent: "PARENT",
}

const loginHandler: RequestHandler<
  LoginParams,
  LoginResponse | ApiErrorResponse,
  Partial<LoginRequestBody>
> = (req, res) => {
  const roleParam = req.params.role as LoginRoleParam
  const role = roleParamToRole[roleParam]

  if (!role) {
    void writeSecurityEvent({
      type: "suspicious_request",
      method: req.method,
      path: req.originalUrl,
      status: 400,
      ip: req.ip ?? "",
      user_agent: req.get("user-agent") ?? "",
      details: { reason: "invalid_login_role", roleParam },
    })
    res.status(400).json({ message: "Invalid login role" })
    return
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""
  const password = typeof req.body?.password === "string" ? req.body.password : ""

  if (!email || !password) {
    void writeSecurityEvent({
      type: "auth_failure",
      method: req.method,
      path: req.originalUrl,
      status: 400,
      ip: req.ip ?? "",
      user_agent: req.get("user-agent") ?? "",
      details: { reason: "missing_credentials", role },
    })
    res.status(400).json({ message: "email and password are required" })
    return
  }

  const account = demoAuthAccounts.find(
    (candidate) =>
      candidate.role === role &&
      candidate.email.toLowerCase() === email &&
      candidate.password === password
  )

  if (!account) {
    void writeSecurityEvent({
      type: "auth_failure",
      method: req.method,
      path: req.originalUrl,
      status: 401,
      ip: req.ip ?? "",
      user_agent: req.get("user-agent") ?? "",
      details: { reason: "invalid_credentials", role, email },
    })
    res.status(401).json({ message: "Invalid email or password" })
    return
  }

  const user = demoUsersById[account.userId]
  if (!user) {
    res.status(401).json({ message: "Unknown user" })
    return
  }

  const token = signAccessToken({
    sub: user._id,
    role: user.role,
    email: user.email,
  })

  writeAccessTokenCookie(res, token)

  res.json({
    user,
    rules: defineAbilityFor(user).rules,
    expiresInSeconds: getAccessTokenExpiresInSeconds(),
  })
}

router.post("/login/:role", loginHandler)

router.post("/logout", (_req, res) => {
  clearAccessTokenCookie(res)
  res.status(204).end()
})

const meHandler: RequestHandler<Record<string, never>, MeResponse | ApiErrorResponse> = (req, res) => {
  if (!req.authUser || !req.ability) {
    res.status(401).json({ message: "Unauthenticated" })
    return
  }
  res.json({ user: req.authUser, rules: req.ability.rules })
}

router.get("/me", authenticate, meHandler)

export default router
