import passport from 'passport';
import { studentUsersRepository } from '../repositories/studentUsersRepository.js';

export const googleAuth = passport.authenticate('google', {
  session: false,
  scope: ['profile', 'email'],
});

export const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, data, info) => {
    if (err) return next(err);
    if (!data) {
      return res.redirect(
        `/login?error=${encodeURIComponent(info?.message || 'Authentication failed')}`
      );
    }
    res.cookie('ns_student_token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
    return res.redirect(`${frontendUrl}/dashboard`);
  })(req, res, next);
};

export const githubAuth = passport.authenticate('github', {
  session: false,
  scope: ['user:email'],
});

export const githubCallback = (req, res, next) => {
  passport.authenticate('github', { session: false }, (err, data, info) => {
    if (err) return next(err);
    if (!data) {
      return res.redirect(
        `/login?error=${encodeURIComponent(info?.message || 'Authentication failed')}`
      );
    }
    res.cookie('ns_student_token', data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
    return res.redirect(`${frontendUrl}/dashboard`);
  })(req, res, next);
};

export const getMe = async (req, res) => {
  if (!req.studentUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const fullUser = await studentUsersRepository.findByEmail(req.studentUser.email);
    if (fullUser) {
      return res.json({ user: { ...req.studentUser, ...fullUser } });
    }
  } catch (err) {
    // ignore and return payload-only
  }
  return res.json({ user: req.studentUser });
};

export const updateSlackSettings = async (req, res) => {
  if (!req.studentUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { slackUserId, slackDmReminders } = req.body;
  try {
    const updatedUser = await studentUsersRepository.updateSlackSettings(req.studentUser.email, {
      slackUserId,
      slackDmReminders,
    });
    return res.json({ success: true, user: { ...req.studentUser, ...updatedUser } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update Slack settings: ' + err.message });
  }
};

export const logout = (req, res) => {
  res.clearCookie('ns_student_token');
  return res.json({ ok: true });
};
