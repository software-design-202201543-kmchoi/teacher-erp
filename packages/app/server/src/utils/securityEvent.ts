import { SecurityEventModel } from "@teacher-erp/shared-db"
import type { SecurityEventType } from "@teacher-erp/shared-db"

export async function writeSecurityEvent(params: {
  type: SecurityEventType
  actor_id?: string | null
  method: string
  path: string
  status: number
  ip?: string
  user_agent?: string
  details?: unknown
}): Promise<void> {
  try {
    await SecurityEventModel.create({
      type: params.type,
      actor_id: params.actor_id ?? null,
      method: params.method,
      path: params.path,
      status: params.status,
      ip: params.ip ?? "",
      user_agent: params.user_agent ?? "",
      details: params.details ?? null,
      occurred_at: new Date(),
    })
  } catch (err) {
    console.error("[security] Failed to write security event:", err)
  }
}

