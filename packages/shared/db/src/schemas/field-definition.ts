import mongoose, { Schema } from 'mongoose';

/**
 * 학생부 커스텀 항목 메타데이터
 *
 * 설계: 별도 컬렉션으로 항목 정의를 분리하고
 * AcademicRecord.custom_fields: Map<fieldId, value> 방식으로 데이터를 저장한다.
 * 항목 삭제 대신 is_active=false로 비활성화 처리하여 기존 데이터 호환을 보존한다.
 */
const fieldDefinitionSchema = new Schema(
  {
    field_id: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    field_type: { type: String, enum: ['text', 'number', 'date'], required: true, default: 'text' },
    visibility: {
      type: String,
      enum: ['TEACHER_ONLY', 'PUBLIC'],
      required: true,
      default: 'TEACHER_ONLY',
    },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

fieldDefinitionSchema.index({ field_id: 1 }, { unique: true });
fieldDefinitionSchema.index({ is_active: 1 });

export const FieldDefinitionModel = mongoose.model('FieldDefinition', fieldDefinitionSchema);
