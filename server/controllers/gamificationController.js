import { studentUsersRepository } from '../repositories/studentUsersRepository.js';

/**
 * Get Leaderboard lists sorted by XP score
 */
export async function getLeaderboard(req, res, next) {
  try {
    const filter = String(req.query.filter || 'all').toLowerCase();
    const leaderboard = await studentUsersRepository.getLeaderboard(filter);

    // Map database properties to the frontend payload shape
    const formatted = leaderboard.map((user, i) => ({
      rank: i + 1,
      name: user.name || user.email.split('@')[0],
      xp: user.xp || 0,
      level: user.level || 1,
      avatar: user.avatar_url || '👤',
      badges: user.badges || [],
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return res.status(500).json({ error: 'Failed to retrieve leaderboard rankings.' });
  }
}

/**
 * Award XP to a student user dynamically
 */
export async function awardXP(req, res, next) {
  try {
    const { userId, amount } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required' });
    }

    const updatedUser = await studentUsersRepository.awardXP(userId, parsedAmount);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      success: true,
      xp: updatedUser.xp,
      level: updatedUser.level,
      badges: updatedUser.badges,
    });
  } catch (error) {
    console.error('Failed to award XP:', error);
    return res.status(500).json({ error: 'Failed to award XP.' });
  }
}
