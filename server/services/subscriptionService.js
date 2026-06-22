import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['public_events', 'basic_portfolio', 'leaderboards', 'storage_100mb'],
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 499,
    features: [
      'public_events',
      'basic_portfolio',
      'leaderboards',
      'storage_unlimited',
      'priority_registration',
      'premium_events',
      'advanced_portfolio',
      'badge_showcase',
      'no_ads',
    ],
    trialDays: 7,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 999,
    features: [
      'public_events',
      'basic_portfolio',
      'leaderboards',
      'storage_unlimited',
      'priority_registration',
      'premium_events',
      'advanced_portfolio',
      'badge_showcase',
      'no_ads',
      'networking_priority',
      'skill_exchange_premium',
      'priority_support',
      'custom_domain_certs',
      'advanced_analytics',
    ],
  },
};

const subscriptions = new Map();
const billingHistory = new Map();
const referrals = new Map();

export const subscriptionService = {
  getTiers() {
    return Object.values(TIERS);
  },

  getTier(tierId) {
    return TIERS[tierId] || TIERS.free;
  },

  getFeatures(tierId) {
    const tier = this.getTier(tierId);
    return tier.features || [];
  },

  hasFeature(tierId, feature) {
    const features = this.getFeatures(tierId);
    return features.includes(feature);
  },

  getSubscription(userId) {
    return (
      subscriptions.get(userId) || { tier: 'free', status: 'active', features: TIERS.free.features }
    );
  },

  createSubscription(userId, tierId, paymentMethod = 'card') {
    const tier = this.getTier(tierId);
    if (tier.id === 'free') return this.getSubscription(userId);

    const now = Date.now();
    const sub = {
      id: uuidv4(),
      userId,
      tier: tierId,
      status: 'active',
      features: [...tier.features],
      price: tier.price,
      paymentMethod,
      trialEnd: now + (tier.trialDays || 0) * 86400000,
      currentPeriodStart: now,
      currentPeriodEnd: now + 30 * 86400000,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };
    subscriptions.set(userId, sub);
    logger.info(`Subscription created for user ${userId}: ${tierId}`);
    return sub;
  },

  cancelSubscription(userId) {
    const sub = subscriptions.get(userId);
    if (!sub || sub.tier === 'free') return { error: 'No active subscription' };
    sub.cancelAtPeriodEnd = true;
    sub.updatedAt = Date.now();
    logger.info(`Subscription cancelled for user ${userId}, active until period end`);
    return sub;
  },

  changeTier(userId, newTierId) {
    const tier = this.getTier(newTierId);
    if (tier.id === 'free') {
      subscriptions.delete(userId);
      return { tier: 'free', status: 'active', features: TIERS.free.features };
    }
    const now = Date.now();
    const sub = {
      id: uuidv4(),
      userId,
      tier: newTierId,
      status: 'active',
      features: [...tier.features],
      price: tier.price,
      paymentMethod: 'card',
      trialEnd: now + (tier.trialDays || 0) * 86400000,
      currentPeriodStart: now,
      currentPeriodEnd: now + 30 * 86400000,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    };
    subscriptions.set(userId, sub);
    logger.info(`Subscription changed for user ${userId} to ${newTierId}`);
    return sub;
  },

  processPayment(userId, amount) {
    const invoice = {
      id: uuidv4(),
      userId,
      amount,
      currency: 'usd',
      status: 'paid',
      paidAt: new Date().toISOString(),
      description: `NexaSphere Premium - ${new Date().toLocaleDateString()}`,
    };
    const history = billingHistory.get(userId) || [];
    history.push(invoice);
    billingHistory.set(userId, history);
    return invoice;
  },

  getBillingHistory(userId) {
    return billingHistory.get(userId) || [];
  },

  listAllSubscriptions() {
    return Array.from(subscriptions.values());
  },

  createReferral(userId) {
    const code = uuidv4().slice(0, 8).toUpperCase();
    referrals.set(code, { userId, uses: 0, createdAt: Date.now() });
    return { code, discount: 30 };
  },

  useReferral(code) {
    const ref = referrals.get(code);
    if (!ref) return { error: 'Invalid referral code' };
    ref.uses += 1;
    return { discount: 30, referrerId: ref.userId };
  },
};
