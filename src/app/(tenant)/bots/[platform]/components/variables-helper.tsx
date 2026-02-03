'use client';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCopy, Info, Plus } from "lucide-react";
import { MediaPickerDialog } from "@/components/media-picker-dialog";

const variables = [
    { name: '{userName}', description: 'Nome do usuário' },
    { name: '{planName}', description: 'Nome do plano assinado' },
    { name: '{inviteLink}', description: 'Link de convite único para o grupo' },
    { name: '{expirationDate}', description: 'Data de expiração do plano' },
    { name: '{discountPrice}', description: 'Preço do plano com desconto' },
    { name: '{originalPrice}', description: 'Preço original do plano' },
    { name: '{discountPercent}', description: 'Percentual de desconto aplicado' },
];

interface VariablesHelperProps {
    tenantId: string;
}

export function VariablesHelper({ tenantId }: VariablesHelperProps) {
    const { toast } = useToast();

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copiado!", description: `A variável ${text} foi copiada.` });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-1.5">
                    <Info className="h-4 w-4" />
                    Variáveis Disponíveis
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Variáveis</h4>
                        <p className="text-sm text-muted-foreground">
                            Clique para copiar e usar nas suas mensagens.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        {variables.map((variable) => (
                            <div
                                key={variable.name}
                                className="grid grid-cols-[1fr_auto] items-center gap-4"
                            >
                                <div>
                                    <p className="text-sm font-mono font-medium leading-none">{variable.name}</p>
                                    <p className="text-sm text-muted-foreground">{variable.description}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => copyToClipboard(variable.name)}
                                >
                                    <ClipboardCopy className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}

                        {/* Media Variable */}
                        <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-t pt-2 mt-1">
                            <div>
                                <p className="text-sm font-mono font-medium leading-none">[Mídia](url)</p>
                                <p className="text-sm text-muted-foreground">Inserir imagem/vídeo</p>
                            </div>
                            <MediaPickerDialog
                                tenantId={tenantId}
                                onSelect={(url) => copyToClipboard(`[Mídia](${url})`)}
                                trigger={
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
