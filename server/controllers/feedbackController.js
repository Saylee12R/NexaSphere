import { feedbackService } from '../services/feedbackService.js';

export const submitFeedback = async (req, res) => {
  try {
    const feedback = await feedbackService.submitFeedback(req.body);
    res.status(201).json({ success: true, feedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

export const getFeedbackAnalytics = async (req, res) => {
  try {
    const { eventId } = req.params;
    const analytics = await feedbackService.getFeedbackAnalytics(eventId);
    res.status(200).json({ success: true, analytics });
  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

export const getFeedbacks = async (req, res) => {
  try {
    const { eventId } = req.params;
    const feedbacks = await feedbackService.getFeedbacks(eventId);
    res.status(200).json({ success: true, feedbacks });
  } catch (error) {
    console.error('Error getting feedbacks:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

export const createActionItem = async (req, res) => {
  try {
    const actionItem = await feedbackService.createActionItem(req.body);
    res.status(201).json({ success: true, actionItem });
  } catch (error) {
    console.error('Error creating action item:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

export const getActionItems = async (req, res) => {
  try {
    const { eventId } = req.params;
    const actionItems = await feedbackService.getActionItems(eventId);
    res.status(200).json({ success: true, actionItems });
  } catch (error) {
    console.error('Error getting action items:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
