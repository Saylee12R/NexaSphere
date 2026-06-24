import { describe, it, expect } from 'vitest';
import { computeDynamicPrice } from '../services/dynamicPricingService.js';

describe('Dynamic Pricing Engine', () => {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const NOW = new Date('2026-06-18T10:00:00.000Z');

  const baseConfig = {
    basePrice: 1000,
    minPrice: 500,
    maxPrice: 2500,
    capacity: 100,
    registrations: 0,
    now: NOW,
  };

  it('applies Early Bird discount (-20%) if >30 days out', () => {
    const eventDate = new Date(NOW.getTime() + 40 * ONE_DAY);
    const result = computeDynamicPrice({ ...baseConfig, eventDate });

    expect(result.price).toBe(800);
    expect(result.reasons).toContain('early_bird_-20pct');
  });

  it('applies Standard rate (0%) if 15-30 days out', () => {
    const eventDate = new Date(NOW.getTime() + 20 * ONE_DAY);
    const result = computeDynamicPrice({ ...baseConfig, eventDate });

    expect(result.price).toBe(1000);
    expect(result.reasons).toContain('standard_rate');
  });

  it('applies Last Minute premium (+20%) if 3-15 days out', () => {
    const eventDate = new Date(NOW.getTime() + 10 * ONE_DAY);
    const result = computeDynamicPrice({ ...baseConfig, eventDate });

    expect(result.price).toBe(1200);
    expect(result.reasons).toContain('last_minute_+20pct');
  });

  it('applies Final Days premium (+50%) if <3 days out', () => {
    const eventDate = new Date(NOW.getTime() + 2 * ONE_DAY);
    const result = computeDynamicPrice({ ...baseConfig, eventDate });

    expect(result.price).toBe(1500);
    expect(result.reasons).toContain('final_days_+50pct');
  });

  it('applies Demand premium (+25%) if utilization >= 95%', () => {
    const eventDate = new Date(NOW.getTime() + 20 * ONE_DAY); // Standard time
    const result = computeDynamicPrice({ ...baseConfig, eventDate, registrations: 96 });

    expect(result.price).toBe(1250);
    expect(result.reasons).toContain('demand_95pct_+25pct');
  });

  it('applies Demand premium (+10%) if utilization >= 80%', () => {
    const eventDate = new Date(NOW.getTime() + 20 * ONE_DAY); // Standard time
    const result = computeDynamicPrice({ ...baseConfig, eventDate, registrations: 85 });

    expect(result.price).toBe(1100);
    expect(result.reasons).toContain('demand_80pct_+10pct');
  });

  it('applies Demand discount (-15%) if utilization <= 20%', () => {
    const eventDate = new Date(NOW.getTime() + 20 * ONE_DAY); // Standard time
    const result = computeDynamicPrice({ ...baseConfig, eventDate, registrations: 10 });

    expect(result.price).toBe(850);
    expect(result.reasons).toContain('low_demand_-15pct');
  });

  it('combines Time and Demand multipliers (e.g. Final Days + 95% Demand = 1.5 * 1.25 = 1.875)', () => {
    const eventDate = new Date(NOW.getTime() + 2 * ONE_DAY); // Final Days (x1.5)
    const result = computeDynamicPrice({ ...baseConfig, eventDate, registrations: 96 }); // 95% demand (x1.25)

    expect(result.price).toBe(1875);
    expect(result.reasons).toContain('final_days_+50pct');
    expect(result.reasons).toContain('demand_95pct_+25pct');
  });

  it('clamps the price to minPrice', () => {
    const eventDate = new Date(NOW.getTime() + 40 * ONE_DAY); // Early bird (-20%)
    const result = computeDynamicPrice({
      ...baseConfig,
      minPrice: 900, // Clamp at 900
      eventDate,
      registrations: 10, // Low demand (-15%)
    });

    // 1000 * 0.8 * 0.85 = 680, but minPrice is 900
    expect(result.price).toBe(900);
  });

  it('clamps the price to maxPrice', () => {
    const eventDate = new Date(NOW.getTime() + 2 * ONE_DAY); // Final days (+50%)
    const result = computeDynamicPrice({
      ...baseConfig,
      maxPrice: 1600, // Clamp at 1600
      eventDate,
      registrations: 96, // 95% demand (+25%)
    });

    // 1000 * 1.5 * 1.25 = 1875, but maxPrice is 1600
    expect(result.price).toBe(1600);
  });
});
