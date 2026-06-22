import { subscriptionService } from '../services/subscriptionService.js';

export async function listSubscriptions(req, res) {
  try {
    const subscriptions = subscriptionService.listAllSubscriptions();
    res.json({ subscriptions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getStats(req, res) {
  try {
    const subs = subscriptionService.listAllSubscriptions();
    res.json({
      total: subs.length,
      premium: subs.filter((s) => s.tier === 'premium').length,
      pro: subs.filter((s) => s.tier === 'pro').length,
      revenue: subs.reduce((sum, s) => sum + (s.price || 0), 0),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createSubscription(req, res) {
  try {
    const { userId, tierId } = req.body;
    if (!userId || !tierId) return res.status(400).json({ error: 'userId and tierId required' });
    const result = subscriptionService.createSubscription(userId, tierId);
    subscriptionService.processPayment(userId, result.price);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function cancelSubscription(req, res) {
  try {
    const { userId } = req.params;
    const result = subscriptionService.cancelSubscription(userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getBillingHistory(req, res) {
  try {
    const { userId } = req.params;
    const history = subscriptionService.getBillingHistory(userId);
    res.json({ invoices: history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
