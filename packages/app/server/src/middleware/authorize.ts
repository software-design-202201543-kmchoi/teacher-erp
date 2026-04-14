import type { NextFunction, Request, Response } from "express"
import type { Actions, Subjects } from "@teacher-erp/shared-utils"

type SubjectFactory = (req: Request) => Record<string, unknown> | undefined

export function authorize(action: Actions, subject: Subjects, subjectFactory?: SubjectFactory) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.ability || !req.authUser) {
      res.status(401).json({ message: "Unauthenticated" })
      return
    }

    const subjectPayload = subjectFactory?.(req)
    const target = subjectPayload
      ? { __t: subject, ...subjectPayload }
      : subject

    if (!req.ability.can(action, target as never)) {
      res.status(403).json({
        message: "Forbidden",
        action,
        subject,
      })
      return
    }

    next()
  }
}