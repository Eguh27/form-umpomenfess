import { beforeEach, describe, expect, it } from 'vitest';
import { RATE_LIMIT, checkAndRecord, ipFromHeaders, resetRateLimit } from './rateLimit';

const START = 1_000_000;

beforeEach(() => resetRateLimit());

describe('ipFromHeaders', () => {
  it('x-forwarded-for pertama setelah koma', () => {
    const h = new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    expect(ipFromHeaders(h)).toBe('1.2.3.4');
  });
  it('fallback x-real-ip lalu 0.0.0.0', () => {
    expect(ipFromHeaders(new Headers({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
    expect(ipFromHeaders(new Headers())).toBe('0.0.0.0');
  });
});

describe('checkAndRecord (T-51/T-54)', () => {
  it('diterima di bawah batas, ditolak saat lewat', () => {
    for (let i = 0; i < RATE_LIMIT.maxPerWindow; i++) {
      expect(checkAndRecord('ip', START)).toBe(true);
    }
    expect(checkAndRecord('ip', START)).toBe(false);
  });

  it('jendela bergeser: hit lama kedaluwarsa → diterima lagi', () => {
    for (let i = 0; i < RATE_LIMIT.maxPerWindow; i++) checkAndRecord('ip', START);
    expect(checkAndRecord('ip', START)).toBe(false);
    expect(checkAndRecord('ip', START + RATE_LIMIT.windowMs + 1)).toBe(true);
  });

  it('IP berbeda tak saling mengganggu; max kustom utk endpoint lain', () => {
    expect(checkAndRecord('a', START)).toBe(true);
    expect(checkAndRecord('b', START)).toBe(true);
    for (let i = 0; i < 5; i++) expect(checkAndRecord('c', START, 5)).toBe(true);
    expect(checkAndRecord('c', START, 5)).toBe(false);
  });
});

describe('Pluggable RateLimitStore (E-A2)', () => {
  it('mendukung custom store adapter dan pergantian store', async () => {
    const { getRateLimitStore, setRateLimitStore, MemoryRateLimitStore } = await import('./rateLimit');
    const defaultStore = getRateLimitStore();
    expect(defaultStore.name).toBe('memory');

    let customCalls = 0;
    const customStore = {
      name: 'mock-redis',
      check: () => {
        customCalls++;
        return customCalls <= 2;
      },
      reset: () => {
        customCalls = 0;
      },
    };

    setRateLimitStore(customStore);
    expect(getRateLimitStore().name).toBe('mock-redis');
    expect(await checkAndRecord('test-ip')).toBe(true);
    expect(await checkAndRecord('test-ip')).toBe(true);
    expect(await checkAndRecord('test-ip')).toBe(false);

    // Kembalikan ke memory store default
    setRateLimitStore(new MemoryRateLimitStore());
    expect(getRateLimitStore().name).toBe('memory');
  });
});

