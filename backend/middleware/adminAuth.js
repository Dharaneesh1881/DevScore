// Hardcoded admin credentials — sign a special JWT with role=admin
import jwt from 'jsonwebtoken';

const ADMIN_ID = 'admin';
const ADMIN_PASSWORD = 'admin';
const SECRET = process.env.JWT_SECRET || 'dev_secret';

export function adminLogin(req, res) {
    const { id, password } = req.body;
    if (id !== ADMIN_ID || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
    }
    const token = jwt.sign(
        { id: 'admin', role: 'admin', name: 'Administrator' },
        SECRET,
        { expiresIn: '12h' }
    );
    return res.json({ token, user: { id: 'admin', name: 'Administrator', role: 'admin' } });
}

export function requireAdmin(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Admin auth required' });
    }
    try {
        const payload = jwt.verify(header.slice(7), SECRET);
        if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin access only' });
        req.admin = payload;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
