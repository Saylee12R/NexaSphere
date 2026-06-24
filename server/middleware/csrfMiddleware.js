import crypto from 'crypto';

const CSRF_COOKIE = 'ns_csrf_token';

export function csrfProtection(req, res, next) {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (!req.cookies[CSRF_COOKIE]) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
    }
    return next();
  }

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies[CSRF_COOKIE];

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}
