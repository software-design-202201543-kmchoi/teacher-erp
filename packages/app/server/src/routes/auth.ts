import { Router } from "express"
import { defineAbilityFor, demoUsersById } from "@teacher-erp/shared-utils"
import type { Role } from "@teacher-erp/shared-types"
import { demoAuthAccounts } from "../data/authAccounts.js"
import { authenticate } from "../middleware/authenticate.js"
import {
  clearAccessTokenCookie,
  getAccessTokenExpiresInSeconds,
  signAccessToken,
  writeAccessTokenCookie,
} from "../utils/authToken.js"

const router = Router()

type LoginRoleParam = "student" | "teacher" | "parent"

const roleParamToRole: Record<LoginRoleParam, Role> = {
  student: "STUDENT",
  teacher: "TEACHER",
  parent: "PARENT",
}

router.post("/login/:role", (req, res) => {
  const roleParam = req.params.role as LoginRoleParam
  const role = roleParamToRole[roleParam]

  if (!role) {
    res.status(400).json({ message: "Invalid login role" })
    return
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""
  const password = typeof req.body?.password === "string" ? req.body.password : ""

  if (!email || !password) {
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
})

router.post("/logout", (_req, res) => {
  clearAccessTokenCookie(res)
  res.status(204).end()
})

router.get("/me", authenticate, (req, res) => {
  if (!req.authUser || !req.ability) {
    res.status(401).json({ message: "Unauthenticated" })
    return
  }

  res.json({
    user: req.authUser,
    rules: req.ability.rules,
  })
})

export default router
