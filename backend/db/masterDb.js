import mongoose from 'mongoose';

function getMasterUri() {
  if (process.env.MONGO_MASTER_URI) return process.env.MONGO_MASTER_URI;
  const base = process.env.MONGO_BASE_URI;
  if (base) return `${base}/devscore_master`;
  // Derive from MONGO_URI by swapping the DB name
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/web_eval';
  return uri.replace(/\/[^/?]+(\?|$)/, '/devscore_master$1');
}

export const masterConnection = mongoose.createConnection(getMasterUri());
masterConnection.on('connected', () => console.log('Master DB connected'));
masterConnection.on('error', (err) => console.error('Master DB error:', err));
