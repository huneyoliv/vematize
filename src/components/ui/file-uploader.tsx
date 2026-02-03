'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, FileIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { uploadFile } from '@/app/(tenant)/uploads/actions';

interface FileUploaderProps {
    tenantId: string;
    context: 'media_pack' | 'logo' | 'message_attachment' | 'digital_file' | 'other';
    onUploadComplete?: (url: string) => void;
    multiple?: boolean;
    accept?: string;
}

export function FileUploader({ tenantId, context, onUploadComplete, multiple = false, accept = '*/*' }: FileUploaderProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('tenantId', tenantId);
                formData.append('context', context);
                formData.append('file', file);

                const result = await uploadFile(formData);

                if (!result.success || !result.file) {
                    throw new Error(result.error || 'Erro ao fazer upload');
                }

                if (onUploadComplete) {
                    onUploadComplete(result.file.url);
                }

                toast({
                    title: "Sucesso!",
                    description: "Arquivo enviado com sucesso.",
                });
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast({
                variant: "destructive",
                title: "Erro no upload",
                description: error.message,
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                multiple={multiple}
                accept={accept}
            />
            <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
            >
                {isUploading ? (
                    <>
                        <Upload className="mr-2 h-4 w-4 animate-bounce" />
                        Enviando...
                    </>
                ) : (
                    <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload {multiple ? 'Arquivos' : 'Arquivo'}
                    </>
                )}
            </Button>
        </div>
    );
}
