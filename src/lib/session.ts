import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = process.env.SESSION_SECRET || 'project_hub_fallback_secret_key_32_characters_long_minimum';
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export interface SessionPayload {
  userId: string;
  expiresAt: Date;
}

export async function encrypt(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ userId, expiresAt });
  
  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return null;
  
  const payload = await decrypt(sessionCookie);
  if (!payload) return null;
  
  // Verify expiration
  const expiresAtStr = payload.expiresAt;
  if (typeof expiresAtStr === 'string' || expiresAtStr instanceof Date) {
    const expiresAt = new Date(expiresAtStr);
    if (expiresAt < new Date()) {
      return null;
    }
  }
  
  return payload;
}
