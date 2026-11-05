import { describe, expect, it } from 'vitest';
import { getPlatformAllowlistRole } from '@/lib/platform-roles';

describe('platform role allowlist', () => {
  it('grants Super Admin only to an explicitly allowlisted email', () => {
    expect(getPlatformAllowlistRole('owner@example.com', ['OWNER@example.com'], [])).toBe('SUPER_ADMIN');
    expect(getPlatformAllowlistRole('other@example.com', ['owner@example.com'], [])).toBeNull();
  });

  it('gives Super Admin precedence over legacy Admin', () => {
    expect(getPlatformAllowlistRole('root@example.com', ['root@example.com'], ['root@example.com'])).toBe('SUPER_ADMIN');
  });

  it('keeps legacy Admin separate from Super Admin', () => {
    expect(getPlatformAllowlistRole('admin@example.com', [], ['ADMIN@example.com'])).toBe('ADMIN');
  });

  it('normalizes whitespace and rejects blank email values', () => {
    expect(getPlatformAllowlistRole('  root@example.com ', ['root@example.com'], [])).toBe('SUPER_ADMIN');
    expect(getPlatformAllowlistRole(' ', ['root@example.com'], [])).toBeNull();
  });
});
