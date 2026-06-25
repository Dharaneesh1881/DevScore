import mongoose from 'mongoose';

// ── Sub-schemas ────────────────────────────────────────────────────────────
const linterSubSchema = new mongoose.Schema({
  score:    Number,
  maxScore: Number,
  errors:   [String],
  warnings: [String],
  passed:   Boolean
}, { _id: false, suppressReservedKeysWarning: true });

const fnTestSchema = new mongoose.Schema({}, { strict: false, _id: false });

const intTestSchema = new mongoose.Schema({
  name:   String,
  passed: Boolean,
  weight: Number,
  earned: Number
}, { _id: false });

// ── Bucket schemas ─────────────────────────────────────────────────────────
const linterBucketSchema = new mongoose.Schema({
  score:     Number,
  maxScore:  Number,
  htmlhint:  linterSubSchema,
  stylelint: linterSubSchema,
  eslint:    linterSubSchema
}, { _id: false });

const functionalityBucketSchema = new mongoose.Schema({
  score:    Number,
  maxScore: Number,
  earned:   Number,
  rawMax:   Number,
  tests:    [fnTestSchema]
}, { _id: false });

const interactionBucketSchema = new mongoose.Schema({
  score:    Number,
  maxScore: Number,
  tests:    [intTestSchema]
}, { _id: false });

const visualBucketSchema = new mongoose.Schema({
  score:                  Number,
  maxScore:               Number,
  diffPercent:            Number,
  studentScreenshotUrl:   { type: String, default: null },
  referenceScreenshotUrl: { type: String, default: null },
  diffImageUrl:           { type: String, default: null },
  tests:                  { type: Array, default: [] }
}, { _id: false });

const performanceBucketSchema = new mongoose.Schema({
  score:            Number,
  maxScore:         Number,
  performanceScore: { type: Number, default: null },
  metrics:          { type: mongoose.Schema.Types.Mixed, default: {} },
  source:           { type: String, default: null },
  error:            { type: String, default: null }
}, { _id: false });

// ── Main schema ────────────────────────────────────────────────────────────
const evaluationRunSchema = new mongoose.Schema({
  submissionId: { type: String, required: true, index: true },
  completedAt:  { type: Date, default: Date.now },
  totalScore:   { type: Number, default: 0 },
  breakdown: {
    linter:        linterBucketSchema,
    functionality: functionalityBucketSchema,
    interaction:   interactionBucketSchema,
    visual:        visualBucketSchema,
    performance:   performanceBucketSchema
  },
  domSnapshotUrl: { type: String, default: null },
  errorLog: { type: String, default: '' }
});

export default mongoose.model('EvaluationRun', evaluationRunSchema);
