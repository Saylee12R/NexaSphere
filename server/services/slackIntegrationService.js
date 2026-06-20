import logger from '../utils/logger.js';
import eventManager from './eventEmitterService.js';
import { slackRepository } from '../repositories/slackRepository.js';
import { studentUsersRepository } from '../repositories/studentUsersRepository.js';

const SLACK_API_POST_MESSAGE = 'https://slack.com/api/chat.postMessage';
const SLACK_API_LOOKUP_EMAIL = 'https://slack.com/api/users.lookupByEmail';

// Helper to post messages via Bot Token or Webhook
async function postToSlack({ channel, text, blocks }) {
  const config = await slackRepository.getConfig();
  if (!config) {
    logger.debug('[SlackService] No Slack integration configured.');
    return null;
  }

  // 1. Try Bot Token (required for DMs and richer interactions)
  if (config.bot_token) {
    try {
      const targetChannel = channel || config.channel_id || config.channel_name;
      if (!targetChannel) {
        logger.warn('[SlackService] No target channel configured.');
        return null;
      }

      const response = await fetch(SLACK_API_POST_MESSAGE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${config.bot_token}`,
        },
        body: JSON.stringify({
          channel: targetChannel,
          text,
          blocks,
        }),
      });

      const data = await response.json();
      if (data.ok) {
        logger.info('[SlackService] Posted message successfully via Bot Token', {
          channel: targetChannel,
        });
        return data;
      } else {
        logger.error('[SlackService] Failed to post message via Bot Token:', data.error);
        // Fall back to webhook if sending to public channel
        if (channel && channel.startsWith('U')) {
          // Can't fallback to webhook for DMs
          return null;
        }
      }
    } catch (err) {
      logger.error('[SlackService] Error posting message via Bot Token:', err.message);
    }
  }

  // 2. Fall back to Incoming Webhook for channel postings
  if (config.webhook_url && (!channel || !channel.startsWith('U'))) {
    try {
      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, blocks }),
      });

      if (response.ok) {
        logger.info('[SlackService] Posted message successfully via Webhook');
        return { ok: true };
      } else {
        logger.error('[SlackService] Webhook returned status:', response.status);
      }
    } catch (err) {
      logger.error('[SlackService] Error posting message via Webhook:', err.message);
    }
  }

  return null;
}

// Helper to lookup Slack User ID by email
async function lookupUserByEmail(email) {
  const config = await slackRepository.getConfig();
  if (!config || !config.bot_token) return null;

  try {
    const response = await fetch(`${SLACK_API_LOOKUP_EMAIL}?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.bot_token}`,
      },
    });

    const data = await response.json();
    if (data.ok && data.user) {
      return data.user.id;
    } else {
      logger.warn('[SlackService] User lookup by email failed:', data.error || 'No user found');
    }
  } catch (err) {
    logger.error('[SlackService] Error looking up user by email:', err.message);
  }
  return null;
}

export const slackIntegrationService = {
  init() {
    logger.info('[SlackService] Initializing Slack integration listeners');

    eventManager.on('new-event-published', this.handleNewEventPublished.bind(this));
    eventManager.on('registration-confirmed', this.handleRegistrationConfirmed.bind(this));
    eventManager.on('admin-announcement', this.handleAdminAnnouncement.bind(this));
    eventManager.on('event-reminder', this.handleEventReminder.bind(this));
    eventManager.on('deadline-reminder', this.handleDeadlineReminder.bind(this));
  },

  async handleNewEventPublished(data) {
    try {
      const config = await slackRepository.getConfig();
      if (!config || !config.notify_new_events) return;

      const appUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
      const eventLink = `${appUrl}/events/${data.eventId}`;

      const text = `🚀 New Event Published: ${data.eventName}`;
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚀 New Event Published!',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${data.eventName}*\n📅 *Date:* ${data.eventDate}\n${data.description || 'No description provided.'}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View & Register',
                emoji: true,
              },
              url: eventLink,
              style: 'primary',
            },
          ],
        },
      ];

      await postToSlack({ text, blocks });
    } catch (err) {
      logger.error('[SlackService] Error handling new-event-published:', err.message);
    }
  },

  async handleRegistrationConfirmed(data) {
    try {
      const config = await slackRepository.getConfig();
      if (!config || !config.notify_registrations) return;

      const text = `🎟️ New Registration: ${data.userName} registered for ${data.eventName}`;
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🎟️ *New Event Registration*\n*Student:* ${data.userName}\n*Event:* ${data.eventName}\n📅 *Event Date:* ${data.eventDate || 'N/A'}`,
          },
        },
      ];

      await postToSlack({ text, blocks });
    } catch (err) {
      logger.error('[SlackService] Error handling registration-confirmed:', err.message);
    }
  },

  async handleAdminAnnouncement(data) {
    try {
      const config = await slackRepository.getConfig();
      if (!config || !config.notify_announcements) return;

      const text = `📢 Announcement: ${data.title}`;
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📢 Platform Announcement',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${data.title}*\n${data.message || ''}`,
          },
        },
      ];

      if (data.link) {
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Learn More',
              },
              url: data.link,
            },
          ],
        });
      }

      await postToSlack({ text, blocks });
    } catch (err) {
      logger.error('[SlackService] Error handling admin-announcement:', err.message);
    }
  },

  async handleEventReminder(data) {
    try {
      if (!data.userEmail) return;

      const user = await studentUsersRepository.findByEmail(data.userEmail);
      if (!user || !user.slack_dm_reminders) return;

      let slackUserId = user.slack_user_id;
      if (!slackUserId) {
        slackUserId = await lookupUserByEmail(data.userEmail);
        if (slackUserId) {
          // Save for future reference
          await studentUsersRepository.updateSlackSettings(data.userEmail, {
            slackUserId,
            slackDmReminders: true,
          });
        }
      }

      if (!slackUserId) {
        logger.warn(
          '[SlackService] Could not lookup user Slack ID for DM reminder:',
          data.userEmail
        );
        return;
      }

      const appUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
      const eventLink = `${appUrl}/events/${data.eventId}`;

      const text = `⏰ Reminder: ${data.eventName} is coming up!`;
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⏰ *Upcoming Event Reminder*\nHey ${data.userName || 'there'}, your registered event *${data.eventName}* starts soon!\n\n📅 *When:* ${data.eventDate} at ${data.eventTime || 'TBD'}\n📍 *Where:* ${data.eventLocation || 'TBD'}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Go to Event',
              },
              url: eventLink,
            },
          ],
        },
      ];

      await postToSlack({ channel: slackUserId, text, blocks });
    } catch (err) {
      logger.error('[SlackService] Error handling event-reminder:', err.message);
    }
  },

  async handleDeadlineReminder(data) {
    try {
      if (!data.userEmail) return;

      const user = await studentUsersRepository.findByEmail(data.userEmail);
      if (!user || !user.slack_dm_reminders) return;

      let slackUserId = user.slack_user_id;
      if (!slackUserId) {
        slackUserId = await lookupUserByEmail(data.userEmail);
        if (slackUserId) {
          await studentUsersRepository.updateSlackSettings(data.userEmail, {
            slackUserId,
            slackDmReminders: true,
          });
        }
      }

      if (!slackUserId) return;

      const appUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
      const eventLink = `${appUrl}/events/${data.eventId}`;

      const text = `⚠️ Deadline Reminder: Registration for ${data.eventName} closes ${data.deadline || 'soon'}`;
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⚠️ *Registration Deadline Reminder*\nRegistration for *${data.eventName}* is closing *${data.deadline || 'soon'}*!\nMake sure to confirm your spot.`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Register Now',
              },
              url: eventLink,
              style: 'primary',
            },
          ],
        },
      ];

      await postToSlack({ channel: slackUserId, text, blocks });
    } catch (err) {
      logger.error('[SlackService] Error handling deadline-reminder:', err.message);
    }
  },
};
