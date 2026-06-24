import { portfolioSectionsRepository } from '../repositories/portfolioSectionsRepository.js';
import { portfolioRepository } from '../repositories/portfolioRepository.js';
import logger from '../utils/logger.js';

const DEFAULT_SECTIONS = [
  { sectionType: 'about', sectionKey: 'about', title: 'About Me', templateId: 'about' },
  {
    sectionType: 'experience',
    sectionKey: 'experience',
    title: 'Work Experience',
    templateId: 'experience',
  },
  { sectionType: 'projects', sectionKey: 'projects', title: 'Projects', templateId: 'projects' },
  { sectionType: 'skills', sectionKey: 'skills', title: 'Skills', templateId: 'skills' },
  {
    sectionType: 'education',
    sectionKey: 'education',
    title: 'Education',
    templateId: 'education',
  },
];

export const portfolioBuilderService = {
  async getSections(username) {
    const portfolio = await portfolioRepository.getByUsername(username);
    if (!portfolio) throw new Error('Portfolio not found');

    let sections = await portfolioSectionsRepository.getByUsername(username);

    if (sections.length === 0) {
      sections = await this.initializeDefaultSections(username);
    }

    return sections;
  },

  async initializeDefaultSections(username) {
    const sections = DEFAULT_SECTIONS.map((section, index) => ({
      username,
      ...section,
      content: {},
      displayOrder: index,
      isVisible: true,
      isCustom: false,
    }));

    return portfolioSectionsRepository.bulkCreate(sections);
  },

  async addSection(username, data) {
    const portfolio = await portfolioRepository.getByUsername(username);
    if (!portfolio) throw new Error('Portfolio not found');

    const existingSection = await portfolioSectionsRepository.getByUsernameAndKey(
      username,
      data.sectionKey
    );
    if (existingSection) throw new Error('Section with this key already exists');

    const nextOrder = await portfolioSectionsRepository.getMaxOrder(username);

    const section = await portfolioSectionsRepository.create({
      username,
      sectionType: data.sectionType || 'custom',
      sectionKey: data.sectionKey,
      title: data.title,
      content: data.content || {},
      displayOrder: data.displayOrder ?? nextOrder,
      isVisible: data.isVisible !== false,
      isCustom: data.isCustom || false,
      templateId: data.templateId || null,
    });

    logger.info('Portfolio section added', { username, sectionKey: data.sectionKey });
    return section;
  },

  async updateSection(username, sectionKey, patch) {
    const portfolio = await portfolioRepository.getByUsername(username);
    if (!portfolio) throw new Error('Portfolio not found');

    const section = await portfolioSectionsRepository.getByUsernameAndKey(username, sectionKey);
    if (!section) throw new Error('Section not found');

    const updated = await portfolioSectionsRepository.update(section.id, patch);
    logger.info('Portfolio section updated', { username, sectionKey });
    return updated;
  },

  async deleteSection(username, sectionKey) {
    const portfolio = await portfolioRepository.getByUsername(username);
    if (!portfolio) throw new Error('Portfolio not found');

    const section = await portfolioSectionsRepository.getByUsernameAndKey(username, sectionKey);
    if (!section) throw new Error('Section not found');

    if (['about', 'experience', 'projects', 'skills', 'education'].includes(sectionKey)) {
      throw new Error('Cannot delete default sections');
    }

    const deleted = await portfolioSectionsRepository.delete(section.id);
    logger.info('Portfolio section deleted', { username, sectionKey });
    return deleted;
  },

  async reorderSections(username, sectionOrders) {
    const portfolio = await portfolioRepository.getByUsername(username);
    if (!portfolio) throw new Error('Portfolio not found');

    const updates = sectionOrders.map((item) => {
      if (!item.id && item.sectionKey) {
        return { id: item.sectionKey, displayOrder: item.displayOrder };
      }
      return { id: item.id, displayOrder: item.displayOrder };
    });

    const resolvedUpdates = [];
    for (const update of updates) {
      if (update.id && !update.id.includes('-')) {
        const section = await portfolioSectionsRepository.getByUsernameAndKey(username, update.id);
        if (section) {
          resolvedUpdates.push({ id: section.id, displayOrder: update.displayOrder });
        }
      } else {
        resolvedUpdates.push(update);
      }
    }

    const results = await portfolioSectionsRepository.updateOrder(resolvedUpdates);
    logger.info('Portfolio sections reordered', { username, count: results.length });
    return results;
  },

  async toggleSectionVisibility(username, sectionKey) {
    const portfolio = await portfolioRepository.getByUsername(username);
    if (!portfolio) throw new Error('Portfolio not found');

    const section = await portfolioSectionsRepository.getByUsernameAndKey(username, sectionKey);
    if (!section) throw new Error('Section not found');

    const updated = await portfolioSectionsRepository.update(section.id, {
      isVisible: !section.isVisible,
    });

    logger.info('Portfolio section visibility toggled', {
      username,
      sectionKey,
      isVisible: updated.isVisible,
    });
    return updated;
  },

  async getTemplates() {
    return portfolioSectionsRepository.getAllTemplates();
  },

  async addSectionFromTemplate(username, templateId, overrides = {}) {
    const template = await portfolioSectionsRepository.getTemplateById(templateId);
    if (!template) throw new Error('Template not found');

    const sectionKey = overrides.sectionKey || `${template.sectionType}-${Date.now()}`;

    return this.addSection(username, {
      sectionType: template.sectionType,
      sectionKey,
      title: overrides.title || template.name,
      content: { ...template.defaultContent, ...(overrides.content || {}) },
      displayOrder: overrides.displayOrder,
      isVisible: true,
      isCustom: true,
      templateId: template.id,
    });
  },

  async updateSectionContent(username, sectionKey, content) {
    const portfolio = await portfolioRepository.getByUsername(username);
    if (!portfolio) throw new Error('Portfolio not found');

    const section = await portfolioSectionsRepository.getByUsernameAndKey(username, sectionKey);
    if (!section) throw new Error('Section not found');

    const updatedContent = { ...section.content, ...content };
    const updated = await portfolioSectionsRepository.update(section.id, {
      content: updatedContent,
    });

    logger.info('Portfolio section content updated', { username, sectionKey });
    return updated;
  },

  async moveSection(username, sectionKey, direction) {
    const sections = await portfolioSectionsRepository.getByUsername(username);
    const sectionIndex = sections.findIndex((s) => s.sectionKey === sectionKey);

    if (sectionIndex === -1) throw new Error('Section not found');

    const targetIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;

    if (targetIndex < 0 || targetIndex >= sections.length) {
      throw new Error('Cannot move section in this direction');
    }

    const updates = [
      { id: sections[sectionIndex].id, displayOrder: targetIndex },
      { id: sections[targetIndex].id, displayOrder: sectionIndex },
    ];

    const results = await portfolioSectionsRepository.updateOrder(updates);
    logger.info('Portfolio section moved', { username, sectionKey, direction });
    return results;
  },
};
