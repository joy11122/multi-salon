import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

type RoleGuardResult = { response: NextResponse } | { session: Session };

export async function requireRole(roles: string[]): Promise<RoleGuardResult> {
  const session = await auth();
  if (!session?.user?.id) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!roles.includes(session.user.role)) return { response: NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 }) };
  return { session };
}
