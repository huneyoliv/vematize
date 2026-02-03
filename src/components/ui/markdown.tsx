'use client';

import dynamic from 'next/dynamic';

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

export function Markdown({ content }: { content: string }) {
    return <ReactMarkdown>{content}</ReactMarkdown>;
}
