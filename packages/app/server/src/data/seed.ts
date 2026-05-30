import { demoGrades, demoFeedback, demoCounseling } from "@teacher-erp/shared-utils"
import { GradeDoc } from "../models/grade.js"
import { FeedbackDoc } from "../models/feedback.js"
import { CounselingDoc } from "../models/counseling.js"

export async function seedDatabase(): Promise<void> {
  await Promise.all([
    GradeDoc.deleteMany({}),
    FeedbackDoc.deleteMany({}),
    CounselingDoc.deleteMany({}),
  ])

  await Promise.all([
    GradeDoc.insertMany(demoGrades.map((g) => ({ ...g, _id: g._id }))),
    FeedbackDoc.insertMany(demoFeedback.map((f) => ({ ...f, _id: f._id }))),
    CounselingDoc.insertMany(demoCounseling.map((c) => ({ ...c, _id: c._id }))),
  ])

  console.log(
    `[seed] Loaded ${demoGrades.length} grades, ${demoFeedback.length} feedbacks, ${demoCounseling.length} counseling records`,
  )
}
