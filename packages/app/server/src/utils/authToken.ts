import type { Request, Response } from "express"
import jwt from "jsonwebtoken"
import type { Role } from "@teacher-erp/shared-types"

const ACCESS_TOKEN_COOKIE_NAME = "teacher_erp_access_token"
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL_SECONDS ?? 60 * 60)
const ACCESS_TOKEN_TTL_MS = ACCESS_TOKEN_TTL_SECONDS * 1000
const JWT_SECRET = process.env.JWT_SECRET ?? "teacher-erp-dev-secret-change-me"

interface AccessTokenPayload {
  sub: string
  role: Role
  email: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    if (typeof decoded !== "object" || decoded === null) {
      return null
    }

    const { sub, role, email } = decoded as Record<string, unknown>
    if (typeof sub !== "string" || typeof role !== "string" || typeof email !== "string") {
      return null
    }

    return {
      sub,
      role: role as Role,
      email,
    }
  } catch {
    return null
  }
}

export function extractAccessToken(req: Request): string | null {
  const authHeader = req.header("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }

  const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE_NAME]
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken
  }

  return null
}

export function writeAccessTokenCookie(res: Response, token: string) {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACCESS_TOKEN_TTL_MS,
    path: "/",
  })
}

export function clearAccessTokenCookie(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}

export function getAccessTokenExpiresInSeconds() {
  return ACCESS_TOKEN_TTL_SECONDS
}
