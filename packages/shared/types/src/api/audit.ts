export type AuditOperation = 'create' | 'update' | 'delete';
export type AuditCollection = 'grades' | 'feedbacks' | 'counselingrecords' | 'users';

export interface AuditLogEntry {
  _id: string;
  collection: AuditCollection;
  doc_id: string;
  student_id: string;
  operation: AuditOperation;
  actor_id: string;
  actor_name?: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurred_at: string;
}

export interface AuditLogListResponse {
  entries: AuditLogEntry[];
  total: number;
}
