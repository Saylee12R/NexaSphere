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

    if (campaign.status === 'sent' || campaign.status === 'sending') {
      throw new Error('Campaign has already been sent or is currently sending');
    }

    await emailCampaignRepository.updateCampaign(id, { status: 'sending' });

    const segmentUsers = await emailCampaignRepository.getSegmentUsers(campaign.segmentCriteria);

    const queuedCount = await emailCampaignRepository.queueEmails(
      id,
      segmentUsers,
      campaign.subject,
      campaign.templateName,
      campaign.content
    );

    // Initialise analytics as 'queued'
    for (const recipient of segmentUsers) {
      await emailCampaignRepository.insertCampaignAnalytics({
        campaignId: id,
        recipientEmail: recipient.email,
        recipientName: recipient.full_name,
        status: 'queued',
        sentAt: null,
      });
    }

    // Set campaign to sent since it is successfully queued
    await emailCampaignRepository.updateCampaign(id, {
      status: 'sent',
      sentAt: new Date(),
    });

    return {
      campaignId: id,
      totalRecipients: segmentUsers.length,
      queued: queuedCount,
    };
  }

  async processEmailQueue() {
    // Process up to 100 emails in a batch (100 emails / 5 min as per requirements)
    const emails = await emailCampaignRepository.fetchQueuedEmails(100);
    if (!emails || emails.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const email of emails) {
      try {
        const isUnsub = await emailCampaignRepository.isUnsubscribed(email.recipient_email);
        if (isUnsub) {
          await emailCampaignRepository.updateQueuedEmailStatus(
            email.id,
            'failed',
            'User unsubscribed'
          );
          await emailCampaignRepository.updateCampaignAnalyticsStatus(
            email.campaign_id,
            email.recipient_email,
            'failed'
          );
          failedCount++;
          continue;
        }

        const userMock = {
          full_name: email.recipient_name,
          email: email.recipient_email,
        };

        const personalizedSubject = this._personalizeText(email.subject, userMock);
        const contentObj =
          typeof email.content === 'string' ? JSON.parse(email.content) : email.content;
        const personalizedContent = this._personalizeContent(contentObj, userMock);

        const result = await sendEmail({
          to: email.recipient_email,
          subject: personalizedSubject,
          templateName: email.template_name || 'campaign',
          data: {
            name: email.recipient_name,
            content: personalizedContent,
            unsubscribeUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(email.recipient_email)}`,
          },
        });

        if (result.success) {
          await emailCampaignRepository.updateQueuedEmailStatus(email.id, 'sent');
          await emailCampaignRepository.updateCampaignAnalyticsStatus(
            email.campaign_id,
            email.recipient_email,
            'sent',
            new Date()
          );
          sentCount++;
        } else {
          throw new Error('Failed to send via email service');
        }
      } catch (err) {
        // Retry logic: wait 5 minutes before retrying
        const retryAfter = new Date(Date.now() + 5 * 60 * 1000);
        const attempts = (email.attempts || 0) + 1;
        const maxAttempts = email.max_attempts || 3;

        if (attempts >= maxAttempts) {
          await emailCampaignRepository.updateQueuedEmailStatus(email.id, 'failed', err.message);
          await emailCampaignRepository.updateCampaignAnalyticsStatus(
            email.campaign_id,
            email.recipient_email,
            'failed'
          );
        } else {
          await emailCampaignRepository.updateQueuedEmailStatus(
            email.id,
            'failed',
            err.message,
            retryAfter
          );
          // Keep it queued in analytics so it shows it's still trying
        }
        failedCount++;
      }
    }

    return { processed: emails.length, sent: sentCount, failed: failedCount };
  }

  async resendBouncedEmails(campaignId) {
    const campaign = await emailCampaignRepository.getCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const resetCount = await emailCampaignRepository.resetBouncedEmails(campaignId);
    return { success: true, resetCount };
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
