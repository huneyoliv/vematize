'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import { PreRegisterSchema } from '@/lib/schemas';
import { add } from 'date-fns';

type RegisterResult = {
  success: boolean;
  message: string;
};

import { checkRegisterRateLimit } from '@/lib/security/rate-limiter';
import { headers } from 'next/headers';

// ... (schema definition)

export async function registerClient(
  values: z.infer<typeof PreRegisterSchema>
): Promise<RegisterResult> {
  try {
    const validatedData = PreRegisterSchema.parse(values);

    // 🔒 RATE LIMITING
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    const rateLimit = checkRegisterRateLimit(ip);
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: `Muitas tentativas de registro. Tente novamente em ${rateLimit.retryAfter} segundos.`,
      };
    }

    const client = await clientPromise;
    const db = client.db('vematize');
    const tenantsCollection = db.collection('tenants');

    // Check for existing email
    const existingTenant = await tenantsCollection.findOne({
      ownerEmail: validatedData.email,
    });

    if (existingTenant) {
      // If tenant exists but is pending setup, we could resend email or tell them to check email.
      // If active, tell them to login.
      return { success: false, message: 'Este e-mail já está cadastrado.' };
    }

    // Generate verification token
    const crypto = await import('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = add(new Date(), { hours: 24 });
    const tempId = crypto.randomUUID();

    const ownerName = `${validatedData.firstName} ${validatedData.lastName}`;

    await tenantsCollection.insertOne({
      ownerName,
      subdomain: `pending-${tempId}`, // Temporary subdomain
      ownerEmail: validatedData.email,
      birthDate: validatedData.birthDate,
      passwordHash: '', // No password yet
      trialEndsAt: null, // Trial starts after setup
      subscriptionStatus: 'pending_setup',
      termsAcceptedAt: new Date().toISOString(),
      emailVerified: false,
      verificationToken,
      verificationTokenExpires,
      createdAt: new Date(),
    });

    // Send verification email
    const { sendVerificationEmail } = await import('@/lib/email');
    await sendVerificationEmail(validatedData.email, verificationToken, ownerName);

    return { success: true, message: 'Conta criada com sucesso! Verifique seu e-mail para continuar o cadastro.' };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.errors.map(e => e.message).join(', ') };
    }
    console.error('Registration error:', error);
    return { success: false, message: 'Ocorreu um erro inesperado. Tente novamente.' };
  }
}
