export type SearchDataType = "GRADE" | "FEEDBACK" | "COUNSELING"

export interface IntegratedSearchItem {
  id: string
  student_id: string
  student_name: string
  grade_level: number
  class_num: number
  student_num: number
  data_type: SearchDataType
  subject?: string
  summary: string
  occurred_at: string
}

export interface IntegratedSearchResponse {
  page: number
  page_size: number
  total: number
  items: IntegratedSearchItem[]
}
