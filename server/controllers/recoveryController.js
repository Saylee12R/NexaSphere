import { usersRepository } from '../repositories/usersRepository.js';
import { portfolioRepository } from '../repositories/portfolioRepository.js';
import crypto from 'crypto';
import { withDb } from '../repositories/db.js';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export const recoveryController = {
  // Admin: Unlock User Account
  async unlockAccount(req, res) {
    try {
      const { id } = req.params;
      await withDb(async (client) => {
        await client.query(
          `UPDATE users SET is_locked = false, failed_login_attempts = 0, locked_until = NULL WHERE id = $1`,
          [id]
        );
      });
      // Optionally log audit event here
      return res.json({ message: 'Account unlocked successfully' });
    } catch (err) {
      console.error('Error unlocking account:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Admin: Reset Password Directly
  async resetPasswordAsAdmin(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await withDb(async (client) => {
        await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, id]);
      });

      return res.json({ message: 'Password reset successfully' });
    } catch (err) {
      console.error('Error resetting password:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Admin: Delete Portfolio (Soft Delete)
  async deletePortfolio(req, res) {
    try {
      const { username } = req.params;
      await portfolioRepository.delete(username);
      return res.json({ message: 'Portfolio moved to trash' });
    } catch (err) {
      console.error('Error deleting portfolio:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Admin: Recover Portfolio
  async recoverPortfolio(req, res) {
    try {
      const { username } = req.params;
      await portfolioRepository.recover(username);
      return res.json({ message: 'Portfolio recovered successfully' });
    } catch (err) {
      console.error('Error recovering portfolio:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Public: Forgot Password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      // In a real app, send the token via emailService here
      // For now, we just create the token in the DB
      const userResult = await withDb(async (client) => {
        const { rows } = await client.query(`SELECT id FROM users WHERE email = $1`, [email]);
        return rows[0];
      });

      if (userResult) {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await withDb(async (client) => {
          await client.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
            [userResult.id, tokenHash, expiresAt]
          );
        });

        // Mock sending email
        console.log(`Password reset token for ${email}: ${token}`);
      }

      // Always return success to prevent email enumeration
      return res.json({
        message: 'If an account exists with that email, a password reset link has been sent.',
      });
    } catch (err) {
      console.error('Error in forgot password:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Public: Reset Password with Token
  async resetPasswordWithToken(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword || newPassword.length < 8) {
        return res
          .status(400)
          .json({ error: 'Valid token and new password (min 8 chars) required' });
      }

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const result = await withDb(async (client) => {
        const { rows } = await client.query(
          `SELECT id, user_id FROM password_reset_tokens WHERE token_hash = $1 AND used = false AND expires_at > NOW()`,
          [tokenHash]
        );
        return rows[0];
      });

      if (!result) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await withDb(async (client) => {
        // Mark token as used and update user password
        await client.query(`UPDATE password_reset_tokens SET used = true WHERE id = $1`, [
          result.id,
        ]);
        await client.query(
          `UPDATE users SET password_hash = $1, is_locked = false, failed_login_attempts = 0 WHERE id = $2`,
          [hash, result.user_id]
        );
      });

      return res.json({ message: 'Password has been reset successfully' });
    } catch (err) {
      console.error('Error resetting password with token:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};
