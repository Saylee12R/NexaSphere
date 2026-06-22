import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { withDb } from './db.js';
import { HAS_SUPABASE } from '../storage/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SLACK_CONFIG_FILE = path.join(__dirname, '..', 'data', 'slack_config.json');

async function ensureLocalFile() {
  const dir = path.dirname(SLACK_CONFIG_FILE);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(SLACK_CONFIG_FILE);
  } catch {
    await fs.writeFile(
      SLACK_CONFIG_FILE,
      JSON.stringify(
        {
          bot_token: '',
          webhook_url: '',
          channel_name: '',
          channel_id: '',
          notify_new_events: true,
          notify_registrations: true,
          notify_announcements: true,
        },
        null,
        2
      ),
      'utf8'
    );
  }
}

async function readLocalConfig() {
  await ensureLocalFile();
  const raw = await fs.readFile(SLACK_CONFIG_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeLocalConfig(data) {
  await ensureLocalFile();
  await fs.writeFile(SLACK_CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export const slackRepository = {
  async ensureSchema() {
    if (!HAS_SUPABASE) return;
    return withDb(async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS slack_configs (
          id SERIAL PRIMARY KEY,
          bot_token VARCHAR(255) NOT NULL,
          webhook_url VARCHAR(2048),
          channel_name VARCHAR(255),
          channel_id VARCHAR(255),
          notify_new_events BOOLEAN DEFAULT TRUE,
          notify_registrations BOOLEAN DEFAULT TRUE,
          notify_announcements BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    });
  },

  async getConfig() {
    if (!HAS_SUPABASE) {
      return await readLocalConfig();
    }
    try {
      return await withDb(async (client) => {
        const { rows } = await client.query('SELECT * FROM slack_configs ORDER BY id DESC LIMIT 1');
        return rows[0] || null;
      });
    } catch (err) {
      console.error(
        '[slackRepository] Failed to get config from DB. Falling back to local file.',
        err
      );
      return await readLocalConfig();
    }
  },

  async saveConfig(data) {
    if (!HAS_SUPABASE) {
      const local = await readLocalConfig();
      const updated = { ...local, ...data };
      await writeLocalConfig(updated);
      return updated;
    }
    return withDb(async (client) => {
      const bot_token = data.bot_token || '';
      const webhook_url = data.webhook_url || null;
      const channel_name = data.channel_name || null;
      const channel_id = data.channel_id || null;
      const notify_new_events = data.notify_new_events !== false;
      const notify_registrations = data.notify_registrations !== false;
      const notify_announcements = data.notify_announcements !== false;

      const check = await client.query('SELECT id FROM slack_configs LIMIT 1');
      if (check.rows.length > 0) {
        const { rows } = await client.query(
          `UPDATE slack_configs SET
             bot_token = $1,
             webhook_url = $2,
             channel_name = $3,
             channel_id = $4,
             notify_new_events = $5,
             notify_registrations = $6,
             notify_announcements = $7,
             updated_at = NOW()
           WHERE id = $8
           RETURNING *`,
          [
            bot_token,
            webhook_url,
            channel_name,
            channel_id,
            notify_new_events,
            notify_registrations,
            notify_announcements,
            check.rows[0].id,
          ]
        );
        return rows[0];
      } else {
        const { rows } = await client.query(
          `INSERT INTO slack_configs (
             bot_token, webhook_url, channel_name, channel_id,
             notify_new_events, notify_registrations, notify_announcements
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            bot_token,
            webhook_url,
            channel_name,
            channel_id,
            notify_new_events,
            notify_registrations,
            notify_announcements,
          ]
        );
        return rows[0];
      }
    });
  },

  async deleteConfig() {
    if (!HAS_SUPABASE) {
      await writeLocalConfig({
        bot_token: '',
        webhook_url: '',
        channel_name: '',
        channel_id: '',
        notify_new_events: true,
        notify_registrations: true,
        notify_announcements: true,
      });
      return true;
    }
    return withDb(async (client) => {
      await client.query('DELETE FROM slack_configs');
      return true;
    });
  },
};
