process.env.NODE_ENV = 'test';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'StrongPassword123!';
process.env.ADMIN_EVENT_PASSWORD = 'StrongEventPassword123!';
process.env.JWT_SECRET = 'secret_super_long_secret_key_that_is_safe_and_long_enough_for_256bit';

import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { setWithDbOverride } from '../repositories/db.js';
import { financialService } from '../services/financialService.js';

let mockRevenues = [];
let mockEvents = [];

setWithDbOverride(async (fn) => {
  const mockClient = {
    query: async (sql, params) => {
      const sqlLower = sql.toLowerCase();
      if (sqlLower.includes('from revenue_entries')) {
        return { rows: mockRevenues, rowCount: mockRevenues.length };
      }
      if (sqlLower.includes('select id, name from events')) {
        return { rows: mockEvents, rowCount: mockEvents.length };
      }
      return { rows: [], rowCount: 0 };
    },
  };
  return fn(mockClient);
});

beforeEach(() => {
  mockRevenues = [];
  mockEvents = [];
});

test('Revenue Report aggregations and calculations', async () => {
  mockEvents = [
    { id: 'evt_1', name: 'Web Dev Boot Camp' },
    { id: 'evt_2', name: 'AI Summit' },
  ];

  mockRevenues = [
    {
      id: 'rev_1',
      budget_id: 'b_1',
      event_id: 'evt_1',
      source: 'Ticket Sales',
      amount: '500.00',
      description: 'Regular ticket',
      received_at: new Date('2026-06-20T10:00:00Z'),
      created_by: 'usr_admin',
      payment_method: 'card',
      is_refunded: false,
      refund_amount: '0.00',
      tax_amount: '50.00',
    },
    {
      id: 'rev_2',
      budget_id: 'b_1',
      event_id: 'evt_1',
      source: 'Ticket Sales',
      amount: '300.00',
      description: 'Discount ticket',
      received_at: new Date('2026-06-20T12:00:00Z'),
      created_by: 'usr_admin',
      payment_method: 'upi',
      is_refunded: false,
      refund_amount: '0.00',
      tax_amount: '30.00',
    },
    {
      id: 'rev_3',
      budget_id: 'b_1',
      event_id: 'evt_2',
      source: 'Sponsorship',
      amount: '1000.00',
      description: 'Sponsor tier 1',
      received_at: new Date('2026-06-21T09:00:00Z'),
      created_by: 'usr_admin',
      payment_method: 'upi',
      is_refunded: false,
      refund_amount: '0.00',
      tax_amount: '100.00',
    },
    {
      id: 'rev_4',
      budget_id: 'b_1',
      event_id: 'evt_1',
      source: 'Ticket Sales',
      amount: '200.00',
      description: 'Refunded ticket',
      received_at: new Date('2026-06-19T08:00:00Z'),
      created_by: 'usr_admin',
      payment_method: 'card',
      is_refunded: true,
      refund_amount: '200.00',
      tax_amount: '20.00',
    },
  ];

  const adminUser = { id: 'usr_admin', role: 'admin' };
  const report = await financialService.getRevenueReport(adminUser);

  // Gross totals should exclude refunded (rev_4 is refunded, so total gross = 500 + 300 + 1000 = 1800)
  assert.equal(report.stats.totalRevenue, 1800);
  assert.equal(report.stats.totalRefunded, 200);
  assert.equal(report.stats.netRevenue, 1600);
  assert.equal(report.stats.totalTax, 180);

  // Tax Summary
  assert.equal(report.taxSummary.totalBeforeTax, 1620);
  assert.equal(report.taxSummary.totalTax, 180);
  assert.equal(report.taxSummary.totalRevenue, 1800);

  // Revenue by event (evt_1: 500+300=800; evt_2: 1000)
  const devCamp = report.revenueByEvent.find((e) => e.eventName === 'Web Dev Boot Camp');
  const aiSummit = report.revenueByEvent.find((e) => e.eventName === 'AI Summit');
  assert.ok(devCamp);
  assert.equal(devCamp.revenue, 800);
  assert.ok(aiSummit);
  assert.equal(aiSummit.revenue, 1000);

  // Payment method breakdown (Card: 500; UPI: 300+1000=1300)
  const cardMethod = report.paymentMethodBreakdown.find((p) => p.method === 'CARD');
  const upiMethod = report.paymentMethodBreakdown.find((p) => p.method === 'UPI');
  assert.ok(cardMethod);
  assert.equal(cardMethod.amount, 500);
  assert.ok(upiMethod);
  assert.equal(upiMethod.amount, 1300);

  // Refunds logs count
  assert.equal(report.refunds.length, 1);
  assert.equal(report.refunds[0].refundAmount, 200);

  // Daily Trend
  assert.equal(report.revenueTrend.length, 2);
  const trend20 = report.revenueTrend.find((t) => t.date === '2026-06-20');
  assert.equal(trend20.revenue, 800);
});

test('Revenue Report restricts access for organizers', async () => {
  const organizerUser = { id: 'usr_org', role: 'organizer' };
  await assert.rejects(() => financialService.getRevenueReport(organizerUser), /Forbidden/);
});
