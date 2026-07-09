'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/crypto';
import { createSession, deleteSession } from '@/lib/session';
import { redirect } from 'next/navigation';

// Zod schemas for validation
const AuthSchema = z.object({
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters long.' })
    .max(20, { message: 'Username must not exceed 20 characters.' })
    .trim(),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters long.' })
    .trim(),
});

export type ActionState = {
  errors?: {
    username?: string[];
    password?: string[];
    general?: string[];
  };
  success?: boolean;
};

/**
 * Server Action to register the primary admin user.
 * Blocks registration if any user already exists in the database.
 */
export async function register(prevState: ActionState, formData: FormData): Promise<ActionState> {
  // Validate fields
  const validatedFields = AuthSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { username, password } = validatedFields.data;
  let shouldRedirect = false;

  try {
    // Check if any user already exists in the database
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return {
        errors: {
          general: ['An admin user has already been registered on this system.'],
        },
      };
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
      },
    });

    // Create session
    await createSession(user.id);
    shouldRedirect = true;
  } catch (error) {
    console.error('Registration error:', error);
    return {
      errors: {
        general: ['An unexpected error occurred during registration. Please try again.'],
      },
    };
  }

  if (shouldRedirect) {
    redirect('/');
  }

  return {};
}

/**
 * Server Action to log in an existing user.
 */
export async function login(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validatedFields = AuthSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { username, password } = validatedFields.data;
  let shouldRedirect = false;

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return {
        errors: {
          general: ['Invalid username or password.'],
        },
      };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        errors: {
          general: ['Invalid username or password.'],
        },
      };
    }

    // Create session
    await createSession(user.id);
    shouldRedirect = true;
  } catch (error) {
    console.error('Login error:', error);
    return {
      errors: {
        general: ['An unexpected error occurred during login. Please try again.'],
      },
    };
  }

  if (shouldRedirect) {
    redirect('/');
  }

  return {};
}

/**
 * Server Action to log out the user.
 */
export async function logout() {
  await deleteSession();
  redirect('/login');
}
