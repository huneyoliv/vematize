'use server';

import { z } from 'zod';
import clientPromise from '@/lib/mongodb';
import { add } from 'date-fns';

const ForgotPasswordSchema = z.object({
    email: z.string().email('E-mail inválido'),
});

type ForgotPasswordResult = {
    success: boolean;
    message: string;
};

import { checkPasswordResetRateLimit } from '@/lib/security/rate-limiter';
import { headers } from 'next/headers';

// ... (schema definition)

export async function requestPasswordReset(
    values: z.infer<typeof ForgotPasswordSchema>
): Promise<ForgotPasswordResult> {
    try {
        const validatedData = ForgotPasswordSchema.parse(values);

        // 🔒 RATE LIMITING
        const headersList = headers();
        const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

        const rateLimit = checkPasswordResetRateLimit(validatedData.email, ip);
        if (!rateLimit.allowed) {
            return {
                success: false,
                message: `Muitas tentativas. Tente novamente em ${rateLimit.retryAfter} segundos.`,
            };
        }

        const client = await clientPromise;
        const db = client.db('vematize');
        const tenantsCollection = db.collection('tenants');

        const tenant = await tenantsCollection.findOne({ ownerEmail: validatedData.email });

        // Security: Always return success even if email doesn't exist to prevent enumeration
        if (!tenant) {
            // Add a small delay to simulate processing
            await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
            return { success: true, message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' };
        }

        // Generate reset token
        const crypto = await import('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = add(new Date(), { hours: 1 });

        await tenantsCollection.updateOne(
            { _id: tenant._id },
            {
                $set: {
                    resetPasswordToken: resetToken,
                    resetPasswordExpires: resetExpires,
                },
            }
        );

        // Send email
        const { sendPasswordResetEmail } = await import('@/lib/email');
        await sendPasswordResetEmail(validatedData.email, resetToken);

        return { success: true, message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' };

    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, message: error.errors.map(e => e.message).join(', ') };
        }
        console.error('Forgot password error:', error);
        return { success: false, message: 'Ocorreu um erro inesperado. Tente novamente.' };
    }
}
