import { announcementsRepository } from '../repositories/announcementsRepository.js';
import { announcementSchema } from '../schemas/announcementSchema.js';

export const announcementsService = {
  async listAnnouncements({ page = 1, limit = 50 } = {}) {
    return announcementsRepository.list({ page, limit });
  },

  async listAllAnnouncements() {
    return announcementsRepository.listAll();
  },

  async listActiveAnnouncementsForUser(user) {
    return announcementsRepository.listActiveForUser(user);
  },

  async getAnnouncement(id) {
    return announcementsRepository.getById(id);
  },

  async createAnnouncement(input) {
    const validated = announcementSchema.parse(input);
    // Determine status from scheduled date
    if (validated.scheduledFor && new Date(validated.scheduledFor) > new Date()) {
      validated.status = 'scheduled';
    } else {
      validated.status = 'published';
    }
    return announcementsRepository.create(validated);
  },

  async updateAnnouncement(id, input) {
    const validated = announcementSchema.partial().parse(input);
    if (validated.scheduledFor !== undefined) {
      if (validated.scheduledFor && new Date(validated.scheduledFor) > new Date()) {
        validated.status = 'scheduled';
      } else {
        validated.status = 'published';
      }
    }
    return announcementsRepository.update(id, validated);
  },

  async deleteAnnouncement(id) {
    return announcementsRepository.delete(id);
  },
};
