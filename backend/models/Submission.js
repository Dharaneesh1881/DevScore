import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['html', 'css', 'js'], required: true },
  content: { type: String, default: '' },
  isMain: { type: Boolean, default: false }
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  submissionId:  { type: String, required: true, unique: true, index: true },
  assignmentId:  { type: String, required: true, index: true },
  studentId:     { type: String, default: 'anonymous' },
  files: { type: [fileSchema], default: [] },
  status: {
    type: String,
    enum: ['pending', 'processing', 'done', 'error'],
    default: 'pending'
  },
  selectedLibraryIds: { type: [String], default: [] },
  submittedAt: { type: Date, default: Date.now }
});

export default mongoose.model('Submission', submissionSchema);
