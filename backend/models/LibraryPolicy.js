import mongoose from 'mongoose';

// A LibraryPolicy represents one CDN library at a fixed version.
// cdnUrls holds the URL prefixes admin approves (versioned).
// e.g. Bootstrap 5.3.0 → ["https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/",
//                          "https://stackpath.bootstrapcdn.com/bootstrap/5.3.0/"]
// Requests whose URL starts with any of these prefixes are allowed.
const libraryPolicySchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },   // "Bootstrap"
  version: { type: String, required: true, trim: true },   // "5.3.0"
  cdnUrls: { type: [String], default: [] },                // versioned URL prefixes
  enabled: { type: Boolean, default: true },               // system-wide toggle
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('LibraryPolicy', libraryPolicySchema);
