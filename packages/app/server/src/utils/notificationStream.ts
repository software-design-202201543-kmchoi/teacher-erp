import type { Response } from "express"

const subscribers = new Map<string, Set<Response>>()

function getSet(userId: string): Set<Response> {
  const existing = subscribers.get(userId)
  if (existing) return existing
  const next = new Set<Response>()
  subscribers.set(userId, next)
  return next
}

export function subscribeNotificationStream(userId: string, res: Response) {
  getSet(userId).add(res)
}

export function unsubscribeNotificationStream(userId: string, res: Response) {
  const set = subscribers.get(userId)
  if (!set) return
  set.delete(res)
  if (set.size === 0) subscribers.delete(userId)
}

export function broadcastNotification(userId: string) {
  const set = subscribers.get(userId)
  if (!set || set.size === 0) return
  const payload = JSON.stringify({ type: "NOTIFICATION_UPDATED", at: new Date().toISOString() })
  for (const res of set) {
    res.write(`event: notification\n`)
    res.write(`data: ${payload}\n\n`)
  }
}

