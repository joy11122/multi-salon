import { describe, expect, it } from 'vitest';
import { createSalonSlug, hasSalonRole, salonSlugSchema } from '@/lib/tenancy';

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

  it('checks salon membership roles without granting cross-role access', () => {
    expect(hasSalonRole('OWNER', ['OWNER', 'ADMIN'])).toBe(true);
    expect(hasSalonRole('STAFF', ['OWNER', 'ADMIN'])).toBe(false);
    expect(hasSalonRole('PLATFORM_ADMIN', ['OWNER', 'ADMIN'])).toBe(false);
  });
});
