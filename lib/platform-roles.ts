export type PlatformAllowlistRole = 'SUPER_ADMIN' | 'ADMIN';

export function getPlatformAllowlistRole(
  email: string,
  superAdminEmails: readonly string[],
  adminEmails: readonly string[],
): PlatformAllowlistRole | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  const superAdmins = new Set(superAdminEmails.map((value) => value.trim().toLowerCase()).filter(Boolean));
  const admins = new Set(adminEmails.map((value) => value.trim().toLowerCase()).filter(Boolean));
  if (superAdmins.has(normalizedEmail)) return 'SUPER_ADMIN';
  if (admins.has(normalizedEmail)) return 'ADMIN';
  return null;
}

export function getSafePersistedRole(role: unknown): string | null {
  if (typeof role !== 'string' || !role.trim() || role === 'SUPER_ADMIN') return null;
  return role;
}
