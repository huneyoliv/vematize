'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { CompleteRegisterSchema } from "@/lib/schemas"
import { setupAccount } from "./actions"

export default function SetupAccountPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<z.infer<typeof CompleteRegisterSchema>>({
        resolver: zodResolver(CompleteRegisterSchema),
        defaultValues: {
            subdomain: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof CompleteRegisterSchema>) {
        setIsSubmitting(true);
        try {
            const result = await setupAccount(values);
            if (result.success) {
                toast({
                    title: 'Conta configurada!',
                    description: result.message,
                });
                setTimeout(() => router.push('/onboarding'), 2000);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro na configuração',
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro inesperado',
                description: 'Ocorreu um erro. Por favor, tente novamente.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-4 dark">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-2xl font-bold">Configurar Conta</CardTitle>
                    <CardDescription>Defina seu usuário e senha para acessar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="subdomain"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome de Usuário</FormLabel>
                                        <FormControl>
                                            <Input placeholder="seu-usuario" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Senha</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "Finalizar Cadastro"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </main>
    );
}
