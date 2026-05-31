import type { NextFunction, Request, Response } from "express"

export function accessLog(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now()
  res.on("finish", () => {
    const durationMs = Date.now() - startedAt
    const role = req.authUser?.role ?? "ANON"
    const level =
      res.statusCode >= 500 ? "ERROR" :
      res.statusCode >= 400 ? "WARN" :
      durationMs >= 1500 ? "WARN" : "INFO"

    console.log(JSON.stringify({
      level,
      type: "http_access",
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration_ms: durationMs,
      role,
      user_id: req.authUser?._id ?? null,
      ts: new Date().toISOString(),
    }))
  })
  next()
}

