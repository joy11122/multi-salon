import { describe, expect, it } from 'vitest';
import { createSalonSlug, getHighestSalonRole, hasSalonRole, salonSlugSchema } from '@/lib/tenancy';

describe('salon tenancy primitives', () => {
  it('creates stable URL-safe salon slugs', () => {
    expect(createSalonSlug("The Gentlemen's Club — Khulna")).toBe('the-gentlemens-club-khulna');
    expect(createSalonSlug('  Café & Cut  ')).toBe('cafe-cut');
  });

  it('rejects malformed salon slugs', () => {
    expect(salonSlugSchema.safeParse('valid-salon-2').success).toBe(true);
    expect(salonSlugSchema.safeParse('Invalid Slug').success).toBe(false);
    expect(salonSlugSchema.safeParse('../other-salon').success).toBe(false);
    expect(salonSlugSchema.safeParse('ab').success).toBe(false);
  });

  it('selects the highest active role when legacy duplicate memberships exist', () => {
    expect(getHighestSalonRole(['STAFF', 'OWNER', 'ADMIN'])).toBe('OWNER');
    expect(getHighestSalonRole(['STAFF', 'MANAGER'])).toBe('MANAGER');
    expect(getHighestSalonRole(['UNKNOWN', 'INVALID'])).toBeNull();
  });

  it('checks salon membership roles without granting cross-role access', () => {
    expect(hasSalonRole('OWNER', ['OWNER', 'ADMIN'])).toBe(true);
    expect(hasSalonRole('STAFF', ['OWNER', 'ADMIN'])).toBe(false);
    expect(hasSalonRole('PLATFORM_ADMIN', ['OWNER', 'ADMIN'])).toBe(false);
  });
});
