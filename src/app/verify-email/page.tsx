'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { verifyEmail, type VerifyEmailResult } from './actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

import { Suspense } from 'react';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const [result, setResult] = useState<VerifyEmailResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setResult({ success: false, message: 'Token não fornecido.' });
            setIsLoading(false);
            return;
        }

        verifyEmail(token)
            .then((res) => {
                setResult(res);
                if (res.success && res.redirectTo) {
                    // Small delay to show success message
                    setTimeout(() => {
                        router.push(res.redirectTo!);
                    }, 2000);
                }
            })
            .catch(() => {
                setResult({ success: false, message: 'Ocorreu um erro ao verificar o e-mail.' });
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [token, router]);

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    {isLoading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : result?.success ? (
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : (
                        <XCircle className="h-8 w-8 text-red-500" />
                    )}
                </div>
                <CardTitle className="text-2xl font-bold">
                    {isLoading ? 'Verificando...' : result?.success ? 'E-mail Verificado!' : 'Falha na Verificação'}
                </CardTitle>
                <CardDescription>
                    {isLoading ? 'Aguarde enquanto verificamos seu e-mail.' : result?.message}
                </CardDescription>
            </CardHeader>
            {!isLoading && (
                <CardContent className="flex justify-center">
                    <Button asChild className="w-full">
                        <Link href={result?.redirectTo || "/login"}>
                            {result?.success ? 'Continuar' : 'Voltar para Login'}
                        </Link>
                    </Button>
                </CardContent>
            )}
        </Card>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}
