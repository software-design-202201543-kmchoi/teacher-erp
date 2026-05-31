import type { NextFunction, Request, Response } from "express"
import { defineAbilityFor, demoUsersById } from "@teacher-erp/shared-utils"
import { extractAccessToken, verifyAccessToken } from "../utils/authToken.js"
import { writeSecurityEvent } from "../utils/securityEvent.js"

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractAccessToken(req)

  if (!token) {
    void writeSecurityEvent({
      type: "auth_failure",
      method: req.method,
      path: req.originalUrl,
      status: 401,
      ip: req.ip ?? "",
      user_agent: req.get("user-agent") ?? "",
      details: { reason: "missing_token" },
    })
    res.status(401).json({ message: "Unauthenticated" })
    return
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    void writeSecurityEvent({
      type: "auth_failure",
      method: req.method,
      path: req.originalUrl,
      status: 401,
      ip: req.ip ?? "",
      user_agent: req.get("user-agent") ?? "",
      details: { reason: "invalid_or_expired_token" },
    })
    res.status(401).json({ message: "Invalid or expired session" })
    return
  }

  const user = demoUsersById[payload.sub]
  if (!user) {
    void writeSecurityEvent({
      type: "auth_failure",
      method: req.method,
      path: req.originalUrl,
      status: 401,
      ip: req.ip ?? "",
      user_agent: req.get("user-agent") ?? "",
      details: { reason: "unknown_user", sub: payload.sub },
    })
    res.status(401).json({ message: "Unknown user" })
    return
  }

  if (user.role !== payload.role) {
    void writeSecurityEvent({
      type: "suspicious_request",
      actor_id: user._id,
      method: req.method,
      path: req.originalUrl,
      status: 401,
      ip: req.ip ?? "",
      user_agent: req.get("user-agent") ?? "",
      details: { reason: "role_mismatch", tokenRole: payload.role, actualRole: user.role },
    })
    res.status(401).json({ message: "Invalid session" })
    return
  }

  req.authUser = user
  req.ability = defineAbilityFor(user)
  next()
}
