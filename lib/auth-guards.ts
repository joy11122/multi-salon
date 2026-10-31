import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function requireRole(roles: string[]) {
  const session = await auth();
  if (!session?.user?.id) return { response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) };
  if (!roles.includes(session.user.role)) return { response: NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 }) };
  return { session };
}
