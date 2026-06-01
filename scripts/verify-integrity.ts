/**
 * 복구 정합성 검증 스크립트 (SD2-26)
 *
 * 백업 복구 후 실행하여 데이터 일관성을 검증한다.
 * 오류 건수 > 0이면 exit code 1로 종료한다.
 *
 * 실행: MONGODB_URI=<uri> npx tsx scripts/verify-integrity.ts
 */

import mongoose from "mongoose"
import {
  UserModel,
  ParentStudentModel,
  GradeModel,
  AuditLogModel,
  StudentLearningSnapshotModel,
} from "../packages/shared/db/src/index.js"
import { calcGrade } from "../packages/shared/utils/src/grade-calc.js"

interface CheckResult {
  check: string
  status: "ok" | "warn" | "error"
  message: string
  count?: number
  samples?: unknown[]
}

const results: CheckResult[] = []

async function checkParentStudentIntegrity() {
  const links = await ParentStudentModel.find({}, { student_id: 1, parent_id: 1 }).lean()
  const studentIds = links.map((l) => l.student_id)
  const parentIds = links.map((l) => l.parent_id)

  const existingStudents = await UserModel.find(
    { _id: { $in: studentIds }, role: "STUDENT" },
    { _id: 1 },
  ).lean()
  const existingParents = await UserModel.find(
    { _id: { $in: parentIds }, role: "PARENT" },
    { _id: 1 },
  ).lean()

  const existingStudentSet = new Set(existingStudents.map((u) => String(u._id)))
  const existingParentSet = new Set(existingParents.map((u) => String(u._id)))

  const orphanStudents = links.filter((l) => !existingStudentSet.has(String(l.student_id)))
  const orphanParents = links.filter((l) => !existingParentSet.has(String(l.parent_id)))

  const total = orphanStudents.length + orphanParents.length
  results.push({
    check: "parent_student_integrity",
    status: total === 0 ? "ok" : "error",
    message:
      total === 0
        ? `전체 ${links.length}건 학부모-자녀 연결 정상`
        : `고아 참조 ${total}건 발견 (학생: ${orphanStudents.length}, 학부모: ${orphanParents.length})`,
    count: total,
    samples: total > 0 ? [...orphanStudents.slice(0, 3), ...orphanParents.slice(0, 3)] : undefined,
  })
}

async function checkGradeCalculation() {
  const grades = await GradeModel.find({}, { score: 1, calculated_grade: 1 }).lean()
  const mismatches = grades.filter((g) => {
    if (!g.calculated_grade) return false
    return calcGrade(g.score) !== g.calculated_grade
  })

  results.push({
    check: "grade_calculation_consistency",
    status: mismatches.length === 0 ? "ok" : "warn",
    message:
      mismatches.length === 0
        ? `전체 ${grades.length}건 성적 등급 일치`
        : `등급 불일치 ${mismatches.length}건 (전체 ${grades.length}건 중)`,
    count: mismatches.length,
    samples: mismatches.slice(0, 5).map((g) => ({
      id: String(g._id),
      score: g.score,
      stored_grade: g.calculated_grade,
      expected_grade: calcGrade(g.score),
    })),
  })
}

async function checkOlapSnapshotDrift() {
  const snapshots = await StudentLearningSnapshotModel.find(
    {},
    { student_id: 1, term: 1, avg_score: 1 },
  ).lean()

  if (snapshots.length === 0) {
    results.push({
      check: "olap_snapshot_drift",
      status: "warn",
      message: "OLAP 스냅샷이 없음 — Change Streams 파이프라인 동작 여부 확인 필요",
      count: 0,
    })
    return
  }

  const drifted: unknown[] = []
  for (const snap of snapshots) {
    const grades = await GradeModel.find(
      { student_id: snap.student_id, term: snap.term },
      { score: 1 },
    ).lean()

    if (grades.length === 0) continue

    const avg = grades.reduce((sum, g) => sum + g.score, 0) / grades.length
    const drift = Math.abs(avg - (snap.avg_score ?? 0))

    if (drift > avg * 0.1) {
      drifted.push({
        student_id: String(snap.student_id),
        term: snap.term,
        snapshot_avg: snap.avg_score,
        actual_avg: Math.round(avg * 100) / 100,
        drift_pct: Math.round((drift / avg) * 100),
      })
    }
  }

  results.push({
    check: "olap_snapshot_drift",
    status: drifted.length === 0 ? "ok" : "warn",
    message:
      drifted.length === 0
        ? `전체 ${snapshots.length}건 스냅샷 평균점수 10% 이내 일치`
        : `10% 이상 드리프트 ${drifted.length}건 발견 — OLAP 재집계 권장`,
    count: drifted.length,
    samples: drifted.slice(0, 5),
  })
}

async function checkAuditLogContinuity() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const count = await AuditLogModel.countDocuments({ occurred_at: { $gte: since } })

  const gradeCount = await GradeModel.countDocuments({ updatedAt: { $gte: since } })

  results.push({
    check: "audit_log_24h_continuity",
    status: count > 0 || gradeCount === 0 ? "ok" : "warn",
    message:
      count === 0 && gradeCount > 0
        ? `최근 24시간 AuditLog 0건이지만 성적 변경 ${gradeCount}건 존재 — 감사 로그 누락 가능성`
        : `최근 24시간 AuditLog ${count}건`,
    count,
  })
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI 환경변수가 필요합니다.")
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.error("[verify-integrity] MongoDB 연결 완료")

  await checkParentStudentIntegrity()
  await checkGradeCalculation()
  await checkOlapSnapshotDrift()
  await checkAuditLogContinuity()

  await mongoose.disconnect()

  const errorCount = results.filter((r) => r.status === "error").length
  const warnCount = results.filter((r) => r.status === "warn").length

  const output = {
    checked_at: new Date().toISOString(),
    summary: { total: results.length, error: errorCount, warn: warnCount },
    results,
  }

  process.stdout.write(JSON.stringify(output, null, 2) + "\n")

  if (errorCount > 0) {
    console.error(`[verify-integrity] 검증 실패: error ${errorCount}건, warn ${warnCount}건`)
    process.exit(1)
  }

  console.error(`[verify-integrity] 검증 통과 (warn ${warnCount}건)`)
}

main().catch((err) => {
  console.error("[verify-integrity] 예기치 않은 오류:", err)
  process.exit(1)
})
