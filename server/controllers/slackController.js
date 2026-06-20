import { slackRepository } from '../repositories/slackRepository.js';
import { eventsRepository } from '../repositories/eventsRepository.js';
import logger from '../utils/logger.js';

export const startSlackAuth = (req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri =
    process.env.SLACK_REDIRECT_URI ||
    `${req.protocol}://${req.get('host')}/api/slack/auth/callback`;

  if (!clientId) {
    logger.warn('[SlackController] Client ID is not configured.');
    return res.status(400).send('Slack integration Client ID is not configured on the server.');
  }

  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=chat:write,commands,incoming-webhook,users:read,users:read.email&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return res.redirect(slackAuthUrl);
};

export const slackAuthCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5175'}/dashboard?slack_error=missing_code`
    );
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri =
    process.env.SLACK_REDIRECT_URI ||
    `${req.protocol}://${req.get('host')}/api/slack/auth/callback`;

  try {
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenResponse.json();
    if (!data.ok) {
      logger.error('[SlackController] Slack OAuth token exchange failed:', data.error);
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:5175'}/dashboard?slack_error=${encodeURIComponent(data.error)}`
      );
    }

    const bot_token = data.access_token;
    const webhook_url = data.incoming_webhook?.url || null;
    const channel_name = data.incoming_webhook?.channel || null;
    const channel_id = data.incoming_webhook?.channel_id || null;

    await slackRepository.saveConfig({
      bot_token,
      webhook_url,
      channel_name,
      channel_id,
    });

    return res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5175'}/dashboard?slack_success=true`
    );
  } catch (err) {
    logger.error('[SlackController] Slack OAuth callback error:', err.message);
    return res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:5175'}/dashboard?slack_error=internal_error`
    );
  }
};

export const handleSlackCommand = async (req, res) => {
  const { command, text, user_id } = req.body;
  logger.info('[SlackController] Slack Command received:', { command, text, user_id });

  try {
    const { rows: events } = await eventsRepository.listAll({ page: 1, limit: 5 });

    if (!events || events.length === 0) {
      return res.json({
        response_type: 'ephemeral',
        text: 'There are no upcoming events scheduled at the moment. Stay tuned!',
      });
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📅 Upcoming NexaSphere Events',
          emoji: true,
        },
      },
      {
        type: 'divider',
      },
    ];

    events.forEach((event) => {
      const appUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
      const eventLink = `${appUrl}/events/${event.id}`;
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${event.name}*\n📅 *When:* ${event.date || 'TBD'}\n📝 ${event.description ? event.description.substring(0, 120) + '...' : 'No description.'}`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'View Event',
            emoji: true,
          },
          url: eventLink,
        },
      });
    });

    return res.json({
      response_type: 'ephemeral',
      blocks,
    });
  } catch (err) {
    logger.error('[SlackController] Error executing Slack Command:', err.message);
    return res.json({
      response_type: 'ephemeral',
      text: '⚠️ An error occurred while retrieving upcoming events.',
    });
  }
};

export const getSlackConfig = async (req, res) => {
  try {
    const config = await slackRepository.getConfig();
    return res.json({
      connected: !!config?.bot_token,
      channel_name: config?.channel_name || null,
      channel_id: config?.channel_id || null,
      notify_new_events: config?.notify_new_events !== false,
      notify_registrations: config?.notify_registrations !== false,
      notify_announcements: config?.notify_announcements !== false,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve Slack configuration' });
  }
};

export const updateSlackConfig = async (req, res) => {
  const { notify_new_events, notify_registrations, notify_announcements, webhook_url } = req.body;
  try {
    const updated = await slackRepository.saveConfig({
      notify_new_events,
      notify_registrations,
      notify_announcements,
      webhook_url,
    });
    return res.json({ success: true, config: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update Slack configuration: ' + err.message });
  }
};

export const disconnectSlack = async (req, res) => {
  try {
    await slackRepository.deleteConfig();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to disconnect Slack workspace: ' + err.message });
  }
};
