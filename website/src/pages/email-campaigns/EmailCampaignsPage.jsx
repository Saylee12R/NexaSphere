import React, { useState, useEffect } from 'react';
import { buildUrl, getApiBase } from '../../utils/runtimeConfig';

const pageStyle = {
  minHeight: '100vh',
  background: 'var(--bg, #0f172a)',
  color: 'var(--text, #f8fafc)',
  padding: '32px',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const headerStyle = {
  marginBottom: '32px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  paddingBottom: '24px',
};

const titleStyle = {
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 8px 0',
  color: 'var(--text, #f8fafc)',
};

const subtitleStyle = {
  fontSize: '14px',
  color: 'var(--text-secondary, #94a3b8)',
  margin: 0,
};

const tabsStyle = {
  display: 'flex',
  gap: '8px',
  marginBottom: '24px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  paddingBottom: '12px',
};

const tabStyle = (isActive) => ({
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: isActive ? '600' : '400',
  background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
  color: isActive ? '#3b82f6' : 'var(--text-secondary, #94a3b8)',
  transition: 'all 0.2s ease',
});

const cardStyle = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
};

const buttonStyle = (variant = 'primary') => ({
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '600',
  background:
    variant === 'primary' ? '#3b82f6' : variant === 'danger' ? '#ef4444' : 'rgba(255,255,255,0.1)',
  color: '#ffffff',
  transition: 'all 0.2s ease',
});

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(255,255,255,0.05)',
  color: 'var(--text, #f8fafc)',
  fontSize: '14px',
  outline: 'none',
  marginBottom: '12px',
  boxSizing: 'border-box',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
};

const statusBadgeStyle = (status) => {
  const colors = {
    draft: { bg: 'rgba(148, 163, 184, 0.2)', text: '#94a3b8' },
    scheduled: { bg: 'rgba(234, 179, 8, 0.2)', text: '#eab308' },
    sending: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
    sent: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' },
    failed: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
  };
  const c = colors[status] || colors.draft;
  return {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    background: c.bg,
    color: c.text,
  };
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle = {
  textAlign: 'left',
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  fontSize: '12px',
  fontWeight: '600',
  color: 'var(--text-secondary, #94a3b8)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  fontSize: '14px',
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle = {
  background: '#1e293b',
  borderRadius: '16px',
  padding: '32px',
  maxWidth: '560px',
  width: '90%',
  maxHeight: '80vh',
  overflow: 'auto',
  border: '1px solid rgba(255,255,255,0.1)',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '500',
  color: 'var(--text-secondary, #94a3b8)',
  marginBottom: '6px',
};

export default function EmailCampaignsPage() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [error, setError] = useState(null);

  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    templateName: '',
    content: { body: '', buttonText: '', buttonUrl: '' },
    segmentCriteria: {},
    scheduledAt: '',
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    category: 'general',
  });

  const [triggerForm, setTriggerForm] = useState({
    name: '',
    triggerType: 'user_signup',
    campaignId: '',
    conditions: {},
  });

  const apiBase = getApiBase();

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl('/api/campaigns'));
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl('/api/email-templates'));
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTriggers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl('/api/automation-triggers'));
      if (!res.ok) throw new Error('Failed to fetch triggers');
      const data = await res.json();
      setTriggers(data.triggers || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'campaigns') fetchCampaigns();
    else if (activeTab === 'templates') fetchTemplates();
    else if (activeTab === 'triggers') fetchTriggers();
  }, [activeTab]);

  const handleCreateCampaign = async () => {
    try {
      const res = await fetch(buildUrl('/api/campaigns'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignForm),
      });
      if (!res.ok) throw new Error('Failed to create campaign');
      setShowCreateModal(false);
      setCampaignForm({
        name: '',
        subject: '',
        templateName: '',
        content: { body: '', buttonText: '', buttonUrl: '' },
        segmentCriteria: {},
        scheduledAt: '',
      });
      fetchCampaigns();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendCampaign = async (id) => {
    if (!window.confirm('Are you sure you want to send this campaign?')) return;
    try {
      const res = await fetch(buildUrl(`/api/campaigns/${id}/send`), { method: 'POST' });
      if (!res.ok) throw new Error('Failed to send campaign');
      fetchCampaigns();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const res = await fetch(buildUrl(`/api/campaigns/${id}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete campaign');
      fetchCampaigns();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      const res = await fetch(buildUrl('/api/email-templates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });
      if (!res.ok) throw new Error('Failed to create template');
      setShowTemplateModal(false);
      setTemplateForm({ name: '', subject: '', htmlContent: '', category: 'general' });
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(buildUrl(`/api/email-templates/${id}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete template');
      fetchTemplates();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateTrigger = async () => {
    try {
      const res = await fetch(buildUrl('/api/automation-triggers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(triggerForm),
      });
      if (!res.ok) throw new Error('Failed to create trigger');
      setShowTriggerModal(false);
      setTriggerForm({ name: '', triggerType: 'user_signup', campaignId: '', conditions: {} });
      fetchTriggers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTrigger = async (id) => {
    if (!window.confirm('Are you sure you want to delete this trigger?')) return;
    try {
      const res = await fetch(buildUrl(`/api/automation-triggers/${id}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete trigger');
      fetchTriggers();
    } catch (err) {
      setError(err.message);
    }
  };

  const triggerTypes = [
    { value: 'user_signup', label: 'User Signs Up' },
    { value: 'user_inactive', label: 'User Inactive 30 Days' },
    { value: 'milestone_achieved', label: 'Milestone Achieved' },
    { value: 'event_upcoming', label: 'Event in 24 Hours' },
    { value: 'event_ended', label: 'Event Ended' },
    { value: 'new_event', label: 'New Event Matching Interests' },
  ];

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Email Campaigns</h1>
        <p style={subtitleStyle}>Manage automated email campaigns, templates, and triggers</p>
      </div>

      {error && (
        <div
          style={{
            ...cardStyle,
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.1)',
            marginBottom: '16px',
          }}
        >
          <span style={{ color: '#ef4444' }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ ...buttonStyle('ghost'), marginLeft: '12px' }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div style={tabsStyle}>
        <button
          style={tabStyle(activeTab === 'campaigns')}
          onClick={() => setActiveTab('campaigns')}
        >
          Campaigns
        </button>
        <button
          style={tabStyle(activeTab === 'templates')}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
        <button style={tabStyle(activeTab === 'triggers')} onClick={() => setActiveTab('triggers')}>
          Automation Triggers
        </button>
      </div>

      {loading && (
        <div
          style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary, #94a3b8)' }}
        >
          Loading...
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && !loading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>All Campaigns</h3>
            <button style={buttonStyle('primary')} onClick={() => setShowCreateModal(true)}>
              + New Campaign
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div
              style={{
                ...cardStyle,
                textAlign: 'center',
                padding: '48px',
                color: 'var(--text-secondary, #94a3b8)',
              }}
            >
              No campaigns yet. Create your first campaign to get started.
            </div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Subject</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Created</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td style={tdStyle}>{campaign.name}</td>
                    <td style={tdStyle}>{campaign.subject}</td>
                    <td style={tdStyle}>
                      <span style={statusBadgeStyle(campaign.status)}>{campaign.status}</span>
                    </td>
                    <td style={tdStyle}>{new Date(campaign.createdAt).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {campaign.status === 'draft' && (
                          <button
                            style={buttonStyle('primary')}
                            onClick={() => handleSendCampaign(campaign.id)}
                          >
                            Send
                          </button>
                        )}
                        <button
                          style={buttonStyle('danger')}
                          onClick={() => handleDeleteCampaign(campaign.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && !loading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Email Templates</h3>
            <button style={buttonStyle('primary')} onClick={() => setShowTemplateModal(true)}>
              + New Template
            </button>
          </div>

          {templates.length === 0 ? (
            <div
              style={{
                ...cardStyle,
                textAlign: 'center',
                padding: '48px',
                color: 'var(--text-secondary, #94a3b8)',
              }}
            >
              No templates yet. Create your first template to get started.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
              }}
            >
              {templates.map((template) => (
                <div key={template.id} style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        {template.name}
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)' }}>
                        {template.category}
                      </span>
                    </div>
                    <button
                      style={buttonStyle('danger')}
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      Delete
                    </button>
                  </div>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary, #94a3b8)',
                      margin: '8px 0',
                    }}
                  >
                    Subject: {template.subject || 'No subject'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Triggers Tab */}
      {activeTab === 'triggers' && !loading && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Automation Triggers</h3>
            <button style={buttonStyle('primary')} onClick={() => setShowTriggerModal(true)}>
              + New Trigger
            </button>
          </div>

          {triggers.length === 0 ? (
            <div
              style={{
                ...cardStyle,
                textAlign: 'center',
                padding: '48px',
                color: 'var(--text-secondary, #94a3b8)',
              }}
            >
              No automation triggers yet. Create your first trigger to automate email sends.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
              }}
            >
              {triggers.map((trigger) => (
                <div key={trigger.id} style={cardStyle}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        {trigger.name}
                      </h4>
                      <span style={statusBadgeStyle(trigger.is_active ? 'sent' : 'draft')}>
                        {trigger.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <button
                      style={buttonStyle('danger')}
                      onClick={() => handleDeleteTrigger(trigger.id)}
                    >
                      Delete
                    </button>
                  </div>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary, #94a3b8)',
                      margin: '8px 0',
                    }}
                  >
                    Type: {trigger.trigger_type}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowCreateModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>
              Create Campaign
            </h3>

            <label style={labelStyle}>Campaign Name *</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g., Weekly Newsletter"
              value={campaignForm.name}
              onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
            />

            <label style={labelStyle}>Subject Line *</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g., This Week at NexaSphere"
              value={campaignForm.subject}
              onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
            />

            <label style={labelStyle}>Email Body</label>
            <textarea
              style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
              placeholder="Write your email content here..."
              value={campaignForm.content.body}
              onChange={(e) =>
                setCampaignForm({
                  ...campaignForm,
                  content: { ...campaignForm.content, body: e.target.value },
                })
              }
            />

            <label style={labelStyle}>CTA Button Text</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g., Learn More"
              value={campaignForm.content.buttonText}
              onChange={(e) =>
                setCampaignForm({
                  ...campaignForm,
                  content: { ...campaignForm.content, buttonText: e.target.value },
                })
              }
            />

            <label style={labelStyle}>CTA Button URL</label>
            <input
              style={inputStyle}
              type="url"
              placeholder="https://nexasphere.com/events"
              value={campaignForm.content.buttonUrl}
              onChange={(e) =>
                setCampaignForm({
                  ...campaignForm,
                  content: { ...campaignForm.content, buttonUrl: e.target.value },
                })
              }
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '24px',
              }}
            >
              <button style={buttonStyle('ghost')} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button style={buttonStyle('primary')} onClick={handleCreateCampaign}>
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div style={modalOverlayStyle} onClick={() => setShowTemplateModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>
              Create Template
            </h3>

            <label style={labelStyle}>Template Name *</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g., Event Promotion"
              value={templateForm.name}
              onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
            />

            <label style={labelStyle}>Subject Line</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g., Don't miss out!"
              value={templateForm.subject}
              onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
            />

            <label style={labelStyle}>Category</label>
            <select
              style={selectStyle}
              value={templateForm.category}
              onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
            >
              <option value="general">General</option>
              <option value="newsletter">Newsletter</option>
              <option value="event_promotion">Event Promotion</option>
              <option value="welcome">Welcome</option>
              <option value="announcement">Announcement</option>
            </select>

            <label style={labelStyle}>HTML Content *</label>
            <textarea
              style={{
                ...inputStyle,
                minHeight: '150px',
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: '13px',
              }}
              placeholder="<h1>Hello {first_name}!</h1><p>Your email content...</p>"
              value={templateForm.htmlContent}
              onChange={(e) => setTemplateForm({ ...templateForm, htmlContent: e.target.value })}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '24px',
              }}
            >
              <button style={buttonStyle('ghost')} onClick={() => setShowTemplateModal(false)}>
                Cancel
              </button>
              <button style={buttonStyle('primary')} onClick={handleCreateTemplate}>
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Trigger Modal */}
      {showTriggerModal && (
        <div style={modalOverlayStyle} onClick={() => setShowTriggerModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>
              Create Automation Trigger
            </h3>

            <label style={labelStyle}>Trigger Name *</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g., Welcome New Members"
              value={triggerForm.name}
              onChange={(e) => setTriggerForm({ ...triggerForm, name: e.target.value })}
            />

            <label style={labelStyle}>Trigger Type *</label>
            <select
              style={selectStyle}
              value={triggerForm.triggerType}
              onChange={(e) => setTriggerForm({ ...triggerForm, triggerType: e.target.value })}
            >
              {triggerTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '24px',
              }}
            >
              <button style={buttonStyle('ghost')} onClick={() => setShowTriggerModal(false)}>
                Cancel
              </button>
              <button style={buttonStyle('primary')} onClick={handleCreateTrigger}>
                Create Trigger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
