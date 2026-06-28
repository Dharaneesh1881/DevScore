import jwt from 'jsonwebtoken';
import { getTenantConnection, getTenantModels } from '../db/connections.js';

const SECRET = process.env.JWT_SECRET || 'dev_secret';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = {
    id:           payload.id,
    email:        payload.email,
    role:         payload.role,
    name:         payload.name         || null,
    industryId:   payload.industryId   || null,
    industrySlug: payload.industrySlug || null
  };

  // Tenant roles need a DB connection
  if (payload.industrySlug) {
    try {
      req.tenantDb = await getTenantConnection(payload.industrySlug);
      req.db = getTenantModels(req.tenantDb);
    } catch (err) {
      console.error('Tenant DB connection failed:', err.message);
      return res.status(503).json({ error: 'Industry database unavailable' });
    }
  }

  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}
