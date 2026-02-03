

import { getLegalDocument } from '@/app/settings/actions';
import { Metadata } from 'next';
import { Markdown } from '@/components/ui/markdown';

export const metadata: Metadata = {
    title: 'Termos de Uso - Vematize',
    description: 'Leia nossos Termos de Uso.',
};

export default async function TermsPage() {
    const doc = await getLegalDocument('terms_of_service');
    const content = doc?.content || 'Termos de uso não disponíveis no momento.';

    return (
        <div className="container mx-auto py-12 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-8">Termos de Uso</h1>
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
