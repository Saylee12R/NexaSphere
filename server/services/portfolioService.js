import { portfolioRepository } from '../repositories/portfolioRepository.js';
import { achievementsRepository } from '../repositories/achievementsRepository.js';

import eventManager from './eventEmitterService.js';

export const portfolioService = {
  async getByUsername(username) {
    const portfolio = await portfolioRepository.getByUsername(username);
    if (!portfolio) return null;
    const achievements = await achievementsRepository.getByUsername(username);
    return { ...portfolio, achievements };
  },

  async createOrUpdate(data, isNewRegistration) {
    const saved = await portfolioRepository.createOrUpdate(data, isNewRegistration);

    const username = saved.username;
    eventManager.emitEvent('portfolio-updated', {
      username,
      portfolioData: { ...saved, ...data },
    });

    const achievements = await achievementsRepository.getByUsername(username);
    return { ...saved, achievements };
  },

  async awardAchievement(username, achievement) {
    return achievementsRepository.award(username, achievement);
  },

  async removeAchievement(username, achievementName) {
    return achievementsRepository.remove(username, achievementName);
  },
};
