import bcrypt from 'bcryptjs';
import { usersRepository } from '../repositories/usersRepository.js';
import { studentAuthService } from '../services/studentAuthService.js';
import { withDb } from '../repositories/db.js';

export const localLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await withDb(async (client) => {
      const { rows } = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      return rows[0];
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Local login is not enabled for this user' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Map `users` table fields to the payload expected by studentAuthService
    const tokenPayload = {
      id: user.id,
      provider: 'local',
      email: user.email,
      full_name: user.display_name,
      role: user.role || 'user',
    };

    const token = studentAuthService.generateToken(tokenPayload);

    res.cookie('ns_student_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({ ok: true, user: tokenPayload });
  } catch (error) {
    console.error('Local login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
