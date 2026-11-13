import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import type { Provider } from 'next-auth/providers';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { compare } from 'bcryptjs';
import { getClient, getDb } from '@/lib/db/client';
import { rateLimit } from '@/lib/rate-limit';
import { getPlatformAllowlistRole, getSafePersistedRole } from '@/lib/platform-roles';

const authSecret = process.env.AUTH_SECRET;
const providers: Provider[] = [];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }));
}
providers.push(Credentials({
  name: 'Email and password',
  credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
  async authorize(credentials) {
    const email = String(credentials?.email || '').trim().toLowerCase();
    const password = String(credentials?.password || '');
    if (!email || !password || !(await rateLimit(`login:${email}`, 10, 60_000)).allowed) return null;
    const db = await getDb();
    const user = await db.collection('users').findOne({ email });
    if (!user || typeof user.passwordHash !== 'string' || !(await compare(password, user.passwordHash))) return null;
    return { id: String(user._id), name: user.name, email: user.email, role: user.role || 'CUSTOMER' };
  },
}));

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  adapter: process.env.MONGODB_URI ? MongoDBAdapter(getClient(), { databaseName: process.env.MONGODB_DB_NAME }) : undefined,
  session: { strategy: 'jwt' },
  providers,
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as typeof user & { role?: string }).role || 'CUSTOMER';
      }
      token.role = getSafePersistedRole(token.role) || 'CUSTOMER';
      if (token.email) {
        const normalizedTokenEmail = String(token.email).trim().toLowerCase();
        const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
        const platformRole = getPlatformAllowlistRole(normalizedTokenEmail, superAdminEmails, adminEmails);
        if (platformRole) token.role = platformRole;
        else {
          try { const db = await getDb(); const normalizedEmail = String(token.email).toLowerCase(); const found = await db.collection('users').findOne({ email: normalizedEmail }, { projection: { role: 1 } }); const staff = await db.collection('staff').findOne({ email: normalizedEmail, active: true }, { projection: { _id: 1 } }); token.role = getSafePersistedRole(found?.role) || (staff ? 'STAFF' : getSafePersistedRole(token.role) || 'CUSTOMER'); } catch { token.role = getSafePersistedRole(token.role) || 'CUSTOMER'; }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub || '');
        session.user.role = String(token.role || 'CUSTOMER');
      }
      return session;
    },
  },
});
