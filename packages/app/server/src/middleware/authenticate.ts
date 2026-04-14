import type { NextFunction, Request, Response } from "express"
import { defineAbilityFor, demoUsersById } from "@teacher-erp/shared-utils"
import { extractAccessToken, verifyAccessToken } from "../utils/authToken.js"

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractAccessToken(req)

  if (!token) {
    res.status(401).json({ message: "Unauthenticated" })
    return
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired session" })
    return
  }

  const user = demoUsersById[payload.sub]
  if (!user) {
    res.status(401).json({ message: "Unknown user" })
    return
  }

  if (user.role !== payload.role) {
    res.status(401).json({ message: "Invalid session" })
    return
  }

  req.authUser = user
  req.ability = defineAbilityFor(user)
  next()
}