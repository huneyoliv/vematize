'use server';

import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export type VerifyEmailResult = {
    success: boolean;
    message: string;
    redirectTo?: string;
};

import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/security/rate-limiter';
import { headers } from 'next/headers';

// ...

export async function verifyEmail(token: string): Promise<VerifyEmailResult> {
    // 🔒 RATE LIMITING (Prevent token scanning)
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

    // Use API rate limit config (100 req/min) for verification attempts
    const rateLimit = checkRateLimit(`verify-email:${ip}`, RATE_LIMIT_CONFIGS.api);
    if (!rateLimit.allowed) {
        return { success: false, message: 'Muitas tentativas. Aguarde um momento.' };
    }

    if (!token) {
        return { success: false, message: 'Token inválido.' };
    }

    try {
        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const tenant = await tenantsCollection.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() },
        });

        if (!tenant) {
            return { success: false, message: 'Link de verificação inválido ou expirado.' };
        }

        await tenantsCollection.updateOne(
            { _id: tenant._id },
            {
                $set: {
                    emailVerified: true,
                    verificationToken: null,
                    verificationTokenExpires: null,
                },
            }
        );

        // ✅ Create session for setup
        const { createSession } = await import('@/lib/auth');
        const sessionToken = await createSession({
            userId: tenant._id.toString(),
            email: tenant.ownerEmail,
            name: tenant.ownerName || 'Cliente',
            subdomain: tenant.subdomain, // This is the temp subdomain
            type: 'tenant',
            subscriptionStatus: tenant.subscriptionStatus,
        });

        const { cookies } = await import('next/headers');
        cookies().set('session_token', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return {
            success: true,
            message: 'E-mail verificado com sucesso! Redirecionando...',
            redirectTo: '/setup-account'
        };
    } catch (error) {
        console.error('Error verifying email:', error);
        return { success: false, message: 'Ocorreu um erro ao verificar o e-mail.' };
    }
}
