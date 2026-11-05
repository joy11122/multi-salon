import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { z } from 'zod';
import { getDb } from '@/lib/db/client';

export const salonSlugSchema = z.string().trim().toLowerCase().min(3).max(60).regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'Salon URL must contain lowercase letters, numbers and single hyphens only.',
);

export type SalonRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF';
export const salonRoles: readonly SalonRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'];
const rolePriority: Record<SalonRole, number> = { OWNER: 4, ADMIN: 3, MANAGER: 2, STAFF: 1 };

export type SalonMembership = {
  _id: unknown;
  salonId: string;
  userId?: string;
  email: string;
  role: SalonRole;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
};

export function getHighestSalonRole(roles: readonly unknown[]): SalonRole | null {
  const validRoles = roles.filter((role): role is SalonRole => salonRoles.includes(role as SalonRole));
  if (!validRoles.length) return null;
  return validRoles.reduce((highest, role) =>
    rolePriority[role] > rolePriority[highest] ? role : highest,
  );
}

export function createSalonSlug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

export function hasSalonRole(role: string, allowed: readonly SalonRole[]): boolean {
  return salonRoles.includes(role as SalonRole) && allowed.includes(role as SalonRole);
}

export async function findActiveSalonBySlug(slug: string) {
  const parsed = salonSlugSchema.safeParse(slug);
  if (!parsed.success) return null;
  return (await getDb()).collection('salons').findOne({
    slug: parsed.data,
    status: 'ACTIVE',
  });
}

export async function requireSalonMembership(
  session: Session | null,
  salonId: string,
  allowedRoles: readonly SalonRole[],
): Promise<{ membership: SalonMembership } | { response: NextResponse }> {
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  }

  const email = String(session.user.email || '').trim().toLowerCase();
  const identities: Record<string, string>[] = [{ userId: session.user.id }];
  if (email) identities.push({ email });

  const memberships = await (await getDb()).collection('salonMemberships').find({
    salonId,
    status: 'ACTIVE',
    $or: identities,
  }).toArray() as SalonMembership[];

  // Resolve duplicate/legacy rows consistently with the workspace list.
  const role = getHighestSalonRole(memberships.map((membership) => membership.role));
  const membership = role
    ? memberships.find((item) => item.role === role) || null
    : null;

  if (!membership || !hasSalonRole(role || '', allowedRoles)) {
    return { response: NextResponse.json({ error: 'You do not have access to this salon.' }, { status: 403 }) };
  }

  return { membership };
}
