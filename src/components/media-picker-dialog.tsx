'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, FileIcon, Loader2 } from "lucide-react";
import { getUploads } from "@/app/(tenant)/uploads/actions";
import Image from 'next/image';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

interface MediaPickerDialogProps {
    tenantId: string; // We might need to pass this or get it from context/session
    onSelect: (url: string) => void;
    trigger?: React.ReactNode;
}

export function MediaPickerDialog({ tenantId, onSelect, trigger }: MediaPickerDialogProps) {
    const [open, setOpen] = useState(false);
    const [uploads, setUploads] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (open) {
            loadUploads();
        }
    }, [open]);

    const loadUploads = async () => {
        setLoading(true);
        try {
            // We need to pass tenantId. In a real app, getUploads might get it from session if not passed.
            // But getUploads signature is (tenantId: string).
            // We need to ensure we have the tenantId available in the parent component.
            const data = await getUploads(tenantId);
            setUploads(data);
        } catch (error) {
            console.error('Failed to load uploads', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUploads = uploads.filter(u =>
        u.originalName.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (url: string) => {
        onSelect(url);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm"><ImageIcon className="mr-2 h-4 w-4" /> Selecionar Mídia</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Selecionar Mídia</DialogTitle>
                </DialogHeader>

                <div className="flex items-center space-x-2 py-4">
                    <Input
                        placeholder="Buscar arquivos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <ScrollArea className="flex-1">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredUploads.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Nenhum arquivo encontrado.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                            {filteredUploads.map((upload) => (
                                <div
                                    key={upload._id}
                                    className="border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                    onClick={() => handleSelect(upload.url)}
                                >
                                    <div className="aspect-square relative bg-muted flex items-center justify-center">
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
                                    <div className="p-2 text-xs truncate bg-background">
                                        {upload.originalName}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
