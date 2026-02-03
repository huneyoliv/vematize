

import { getLegalDocument } from '@/app/settings/actions';
import { Metadata } from 'next';
import { Markdown } from '@/components/ui/markdown';

export const metadata: Metadata = {
    title: 'Política de Privacidade - Vematize',
    description: 'Leia nossa Política de Privacidade.',
};

export default async function PrivacyPage() {
    const doc = await getLegalDocument('privacy_policy');
    const content = doc?.content || 'Política de privacidade não disponível no momento.';

    return (
        <div className="container mx-auto py-12 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Política de Privacidade</h1>
            {doc?.updatedAt && (
                <p className="text-sm text-muted-foreground mb-4">
                    Última atualização: {new Date(doc.updatedAt).toLocaleDateString('pt-BR')}
                </p>
            )}
            <div className="prose dark:prose-invert max-w-none">
                <Markdown content={content} />
            </div>
        </div>
    );
}
