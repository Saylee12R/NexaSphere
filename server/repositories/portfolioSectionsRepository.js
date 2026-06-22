import { withDb } from './db.js';

function mapSectionRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    sectionType: row.section_type,
    sectionKey: row.section_key,
    title: row.title,
    content: typeof row.content === 'string' ? JSON.parse(row.content) : (row.content ?? {}),
    displayOrder: row.display_order,
    isVisible: row.is_visible,
    isCustom: row.is_custom,
    templateId: row.template_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTemplateRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    sectionType: row.section_type,
    defaultContent:
      typeof row.default_content === 'string'
        ? JSON.parse(row.default_content)
        : (row.default_content ?? {}),
    icon: row.icon,
    createdAt: row.created_at,
  };
}

export const portfolioSectionsRepository = {
  async getByUsername(username) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM portfolio_sections WHERE username = $1 ORDER BY display_order ASC',
        [username]
      );
      return rows.map(mapSectionRow);
    });
  },

  async getByUsernameAndKey(username, sectionKey) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM portfolio_sections WHERE username = $1 AND section_key = $2',
        [username, sectionKey]
      );
      return rows.length ? mapSectionRow(rows[0]) : null;
    });
  },

  async create(section) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO portfolio_sections (username, section_type, section_key, title, content, display_order, is_visible, is_custom, template_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          section.username,
          section.sectionType,
          section.sectionKey,
          section.title,
          JSON.stringify(section.content || {}),
          section.displayOrder || 0,
          section.isVisible !== false,
          section.isCustom || false,
          section.templateId || null,
        ]
      );
      return mapSectionRow(rows[0]);
    });
  },

  async update(id, patch) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        `UPDATE portfolio_sections SET
           title = COALESCE($2, title),
           content = COALESCE($3, content),
           display_order = COALESCE($4, display_order),
           is_visible = COALESCE($5, is_visible),
           updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [
          id,
          patch.title ?? null,
          patch.content ? JSON.stringify(patch.content) : null,
          patch.displayOrder ?? null,
          patch.isVisible !== undefined ? patch.isVisible : null,
        ]
      );
      return rows.length ? mapSectionRow(rows[0]) : null;
    });
  },

  async delete(id) {
    return withDb(async (client) => {
      const { rowCount } = await client.query('DELETE FROM portfolio_sections WHERE id = $1', [id]);
      return rowCount > 0;
    });
  },

  async deleteByUsername(username) {
    return withDb(async (client) => {
      const { rowCount } = await client.query(
        'DELETE FROM portfolio_sections WHERE username = $1',
        [username]
      );
      return rowCount > 0;
    });
  },

  async updateOrder(updates) {
    return withDb(async (client) => {
      const results = [];
      for (const update of updates) {
        const { rows } = await client.query(
          'UPDATE portfolio_sections SET display_order = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
          [update.id, update.displayOrder]
        );
        if (rows.length) results.push(mapSectionRow(rows[0]));
      }
      return results;
    });
  },

  async getMaxOrder(username) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM portfolio_sections WHERE username = $1',
        [username]
      );
      return parseInt(rows[0].next_order, 10);
    });
  },

  async getAllTemplates() {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM portfolio_section_templates ORDER BY name'
      );
      return rows.map(mapTemplateRow);
    });
  },

  async getTemplateById(id) {
    return withDb(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM portfolio_section_templates WHERE id = $1',
        [id]
      );
      return rows.length ? mapTemplateRow(rows[0]) : null;
    });
  },

  async bulkCreate(sections) {
    return withDb(async (client) => {
      const results = [];
      for (const section of sections) {
        const { rows } = await client.query(
          `INSERT INTO portfolio_sections (username, section_type, section_key, title, content, display_order, is_visible, is_custom, template_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [
            section.username,
            section.sectionType,
            section.sectionKey,
            section.title,
            JSON.stringify(section.content || {}),
            section.displayOrder || 0,
            section.isVisible !== false,
            section.isCustom || false,
            section.templateId || null,
          ]
        );
        results.push(mapSectionRow(rows[0]));
      }
      return results;
    });
  },
};
