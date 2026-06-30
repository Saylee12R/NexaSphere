import { Router } from 'express';
import { userGroupsRepository } from '../repositories/userGroupsRepository.js';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';

const router = Router();

router.use('/admin/groups', adminAuthMiddleware.requireAdmin);

// List all groups
router.get('/admin/groups', async (req, res) => {
  try {
    const groups = await userGroupsRepository.listGroups();
    res.json({ groups });
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create group
router.post('/admin/groups', async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const group = await userGroupsRepository.createGroup({ name, description, permissions });
    res.status(201).json({ group });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Group name already exists' });
    }
    console.error('Error creating group:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single group
router.get('/admin/groups/:id', async (req, res) => {
  try {
    const group = await userGroupsRepository.getGroupById(req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json({ group });
  } catch (err) {
    console.error('Error fetching group:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update group
router.put('/admin/groups/:id', async (req, res) => {
  try {
    const group = await userGroupsRepository.updateGroup(req.params.id, req.body);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json({ group });
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete group
router.delete('/admin/groups/:id', async (req, res) => {
  try {
    const success = await userGroupsRepository.deleteGroup(req.params.id);
    if (!success) return res.status(404).json({ error: 'Group not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get group members
router.get('/admin/groups/:id/members', async (req, res) => {
  try {
    const members = await userGroupsRepository.getGroupMembers(req.params.id);
    res.json({ members });
  } catch (err) {
    console.error('Error fetching group members:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add members to group
router.post('/admin/groups/:id/members', async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds)) {
      return res.status(400).json({ error: 'studentIds must be an array' });
    }
    const addedCount = await userGroupsRepository.addMembersToGroup(req.params.id, studentIds);
    res.json({ addedCount });
  } catch (err) {
    console.error('Error adding members:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from group
router.delete('/admin/groups/:id/members/:studentId', async (req, res) => {
  try {
    const success = await userGroupsRepository.removeMemberFromGroup(
      req.params.id,
      req.params.studentId
    );
    if (!success) return res.status(404).json({ error: 'Member not found in group' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing member:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk email group
router.post('/admin/groups/:id/email', async (req, res) => {
  try {
    const { subject, htmlContent } = req.body;
    if (!subject || !htmlContent) {
      return res.status(400).json({ error: 'Subject and htmlContent required' });
    }

    // Import inside route to avoid circular deps if any
    const { emailCampaignRepository } = await import('../repositories/emailCampaignRepository.js');
    const { emailCampaignService } = await import('../services/emailCampaignService.js');

    // Create a one-off campaign for this group
    const campaign = await emailCampaignRepository.createCampaign({
      name: `Group Email - ${req.params.id} - ${new Date().toISOString()}`,
      subject,
      content: { html: htmlContent },
      segmentCriteria: { groupId: req.params.id },
      status: 'draft',
      createdBy: req.user?.username || 'admin',
    });

    // Send it immediately
    const stats = await emailCampaignService.sendCampaign(campaign.id);
    res.json({ success: true, campaignId: campaign.id, stats });
  } catch (err) {
    console.error('Error sending bulk email:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
