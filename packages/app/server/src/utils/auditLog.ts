import { AuditLogModel } from "@teacher-erp/shared-db"
import type { AuditOperation, AuditCollection } from "@teacher-erp/shared-db"

export async function writeAuditLog(params: {
  collection: AuditCollection
  doc_id: string
  student_id: string
  operation: AuditOperation
  actor_id: string
  before?: unknown
  after?: unknown
}): Promise<void> {
  try {
    await AuditLogModel.create({
      collection: params.collection,
      doc_id: params.doc_id,
      student_id: params.student_id,
      operation: params.operation,
      actor_id: params.actor_id,
      before: params.before ?? null,
      after: params.after ?? null,
      occurred_at: new Date(),
    })
  } catch (err) {
    // 감사 로그 실패가 본 트랜잭션을 중단시키지 않도록 에러를 삼킨다
    console.error("[audit] Failed to write audit log:", err)
  }
}
