import { webhookService } from '../services/webhookService.js';
import logger from '../utils/logger.js';

export const eventPublisher = {
  async publishEvent(eventType, eventData) {
    try {
      logger.info('Publishing event', { eventType });
      return await webhookService.triggerEvent(eventType, eventData);
    } catch (error) {
      logger.error('Error publishing event', { eventType, error: error.message });
      return { total: 0, successful: 0, failed: 0, error: error.message };
    }
  },

  async eventCreated(eventData) {
    return this.publishEvent('event.created', eventData);
  },

  async eventUpdated(eventData) {
    return this.publishEvent('event.updated', eventData);
  },

  async eventCancelled(eventData) {
    return this.publishEvent('event.cancelled', eventData);
  },

  async userRegistered(eventData) {
    return this.publishEvent('user.registered', eventData);
  },

  async userAttendanceMarked(eventData) {
    return this.publishEvent('user.attendance_marked', eventData);
  },

  async certificateIssued(eventData) {
    return this.publishEvent('certificate.issued', eventData);
  },

  async userJoined(eventData) {
    return this.publishEvent('user.joined', eventData);
  },

  async announcementPosted(eventData) {
    return this.publishEvent('announcement.posted', eventData);
  },
};
