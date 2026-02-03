'use client';

import { useState } from 'react';
import { Upload } from '@/lib/types';
import { FileUploader } from '@/components/ui/file-uploader';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Copy, FileIcon, ExternalLink } from 'lucide-react';
import { deleteUpload } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface UploadsManagerProps {
    initialUploads: any[]; // Using any to avoid serialization issues with Date/ObjectId if not perfectly mapped
    tenantId: string;
}

export function UploadsManager({ initialUploads, tenantId }: UploadsManagerProps) {
    const [uploads, setUploads] = useState(initialUploads);
    const { toast } = useToast();
    const router = useRouter();

    const handleDelete = async (uploadId: string) => {
        if (!confirm('Tem certeza que deseja excluir este arquivo?')) return;

        const result = await deleteUpload(uploadId, tenantId);
        if (result.success) {
            setUploads(uploads.filter(u => u._id !== uploadId));
            toast({ title: 'Arquivo excluído com sucesso.' });
            router.refresh();
        } else {
            toast({ variant: 'destructive', title: 'Erro ao excluir arquivo.', description: result.message });
        }
    };

    const handleCopyUrl = (url: string) => {
        const fullUrl = window.location.origin + url;
        navigator.clipboard.writeText(fullUrl);
        toast({ title: 'URL copiada para a área de transferência.' });
    };

    const handleUploadComplete = (url: string) => {
        router.refresh();
        // Ideally we would fetch the new upload and add it to the list, but refresh is simpler
        // We can also reload the page or just wait for the refresh to update the props if we were using a server component wrapper that re-renders this.
        // Since this is a client component receiving initial props, refresh() won't update 'initialUploads' unless the parent re-renders.
        // So we might need to fetch the list again or just reload.
        window.location.reload();
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Gerenciador de Arquivos</h2>
                <FileUploader
                    tenantId={tenantId}
                    context="other"
                    multiple
                    onUploadComplete={handleUploadComplete}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {uploads.map((upload) => (
                    <Card key={upload._id} className="overflow-hidden">
                        <CardHeader className="p-0">
                            <div className="aspect-video relative bg-muted flex items-center justify-center">
                                {upload.thumbnailUrl || (upload.mimeType.startsWith('image/') && upload.url) ? (
                                    <Image
                                        src={upload.thumbnailUrl || upload.url}
                                        alt={upload.originalName}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <FileIcon className="h-12 w-12 text-muted-foreground" />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <CardTitle className="text-sm font-medium truncate" title={upload.originalName}>
                                {upload.originalName}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatSize(upload.size)} • {new Date(upload.createdAt).toLocaleDateString()}
                            </p>
                        </CardContent>
                        <CardFooter className="p-4 pt-0 flex justify-between gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleCopyUrl(upload.url)}>
                                <Copy className="h-4 w-4 mr-2" /> Copiar
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" onClick={() => handleDelete(upload._id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                                <a href={upload.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}

                {uploads.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        Nenhum arquivo encontrado. Faça o upload do seu primeiro arquivo.
                    </div>
                )}
            </div>
        </div>
    );
}
