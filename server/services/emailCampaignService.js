import { emailCampaignRepository } from '../repositories/emailCampaignRepository.js';
import { sendEmail } from './emailService.js';

export class EmailCampaignService {
  // --- Campaigns ---
  async createCampaign(campaignData, user) {
    const campaign = {
      ...campaignData,
      createdBy: user.id,
    };

    return emailCampaignRepository.createCampaign(campaign);
  }

  async getCampaignById(id) {
    const campaign = await emailCampaignRepository.getCampaignById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    return campaign;
  }

  async getCampaigns(filters = {}) {
    return emailCampaignRepository.getCampaigns(filters);
  }

  async updateCampaign(id, patch) {
    const campaign = await emailCampaignRepository.getCampaignById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status === 'sent') {
      throw new Error('Cannot edit a campaign that has already been sent');
    }

    return emailCampaignRepository.updateCampaign(id, patch);
  }

  async deleteCampaign(id) {
    const campaign = await emailCampaignRepository.getCampaignById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status === 'sending') {
      throw new Error('Cannot delete a campaign that is currently sending');
    }

    return emailCampaignRepository.deleteCampaign(id);
  }

  async sendCampaign(id, user) {
    const campaign = await emailCampaignRepository.getCampaignById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status === 'sent') {
      throw new Error('Campaign has already been sent');
    }

    await emailCampaignRepository.updateCampaign(id, { status: 'sending' });

    const segmentUsers = await emailCampaignRepository.getSegmentUsers(campaign.segmentCriteria);

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of segmentUsers) {
      const isUnsub = await emailCampaignRepository.isUnsubscribed(recipient.email);
      if (isUnsub) {
        continue;
      }

      const personalizedSubject = this._personalizeText(campaign.subject, recipient);
      const personalizedContent = this._personalizeContent(campaign.content, recipient);

      const result = await sendEmail({
        to: recipient.email,
        subject: personalizedSubject,
        templateName: campaign.templateName || 'campaign',
        data: {
          name: recipient.full_name,
          content: personalizedContent,
          unsubscribeUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(recipient.email)}`,
        },
      });

      await emailCampaignRepository.insertCampaignAnalytics({
        campaignId: id,
        recipientEmail: recipient.email,
        recipientName: recipient.full_name,
        status: result.success ? 'sent' : 'failed',
        sentAt: new Date(),
      });

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    await emailCampaignRepository.updateCampaign(id, {
      status: 'sent',
      sentAt: new Date(),
    });

    return {
      campaignId: id,
      totalRecipients: segmentUsers.length,
      sent: sentCount,
      failed: failedCount,
    };
  }

  async getCampaignStats(id) {
    const campaign = await emailCampaignRepository.getCampaignById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return emailCampaignRepository.getCampaignStats(id);
  }

  async getCampaignAnalytics(id) {
    const campaign = await emailCampaignRepository.getCampaignById(id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return emailCampaignRepository.getCampaignAnalytics(id);
  }

  async trackOpen(campaignId, recipientEmail) {
    await emailCampaignRepository.markOpened(campaignId, recipientEmail);
  }

  async trackClick(campaignId, recipientEmail) {
    await emailCampaignRepository.markClicked(campaignId, recipientEmail);
  }

  // --- Email Templates ---
  async createTemplate(templateData, user) {
    return emailCampaignRepository.createEmailTemplate({
      ...templateData,
      createdBy: user.id,
    });
  }

  async getTemplateById(id) {
    const template = await emailCampaignRepository.getEmailTemplateById(id);
    if (!template) {
      throw new Error('Email template not found');
    }
    return template;
  }

  async getTemplates(category = null) {
    return emailCampaignRepository.getEmailTemplates(category);
  }

  async updateTemplate(id, patch) {
    const template = await emailCampaignRepository.getEmailTemplateById(id);
    if (!template) {
      throw new Error('Email template not found');
    }
    return emailCampaignRepository.updateEmailTemplate(id, patch);
  }

  async deleteTemplate(id) {
    const template = await emailCampaignRepository.getEmailTemplateById(id);
    if (!template) {
      throw new Error('Email template not found');
    }
    return emailCampaignRepository.deleteEmailTemplate(id);
  }

  // --- Unsubscribe ---
  async unsubscribe(email, reason = null) {
    return emailCampaignRepository.addUnsubscribe(email, reason);
  }

  async resubscribe(email) {
    return emailCampaignRepository.removeUnsubscribe(email);
  }

  async checkUnsubscribed(email) {
    return emailCampaignRepository.isUnsubscribed(email);
  }

  // --- Automation Triggers ---
  async createTrigger(triggerData, user) {
    return emailCampaignRepository.createAutomationTrigger({
      ...triggerData,
      createdBy: user.id,
    });
  }

  async getTriggers() {
    return emailCampaignRepository.getAutomationTriggers();
  }

  async updateTrigger(id, patch) {
    return emailCampaignRepository.updateAutomationTrigger(id, patch);
  }

  async deleteTrigger(id) {
    return emailCampaignRepository.deleteAutomationTrigger(id);
  }

  async fireTrigger(triggerType, userData) {
    const triggers = await emailCampaignRepository.getActiveTriggersByType(triggerType);

    for (const trigger of triggers) {
      if (trigger.campaign_id) {
        await this.sendCampaign(trigger.campaign_id, { id: trigger.created_by });
      }
    }
  }

  // --- Personalization Helpers ---
  _personalizeText(text, user) {
    if (!text) return text;
    return text
      .replace(/\{first_name\}/g, user.full_name?.split(' ')[0] || '')
      .replace(/\{last_name\}/g, user.full_name?.split(' ').slice(1).join(' ') || '')
      .replace(/\{full_name\}/g, user.full_name || '')
      .replace(/\{email\}/g, user.email || '');
  }

  _personalizeContent(content, user) {
    if (!content || typeof content !== 'object') return content;

    const result = { ...content };
    if (result.body) {
      result.body = this._personalizeText(result.body, user);
    }
    if (result.html) {
      result.html = this._personalizeText(result.html, user);
    }
    return result;
  }
}

export const emailCampaignService = new EmailCampaignService();
