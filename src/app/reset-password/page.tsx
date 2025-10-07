'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Loader2 } from "lucide-react"
import Link from "next/link"

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
import { ResetPasswordSchema } from "@/lib/schemas"
import { resetPassword } from "../forgot-password/actions"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const token = searchParams.get('token') || '';

  const form = useForm<z.infer<typeof ResetPasswordSchema>>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      token: token,
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof ResetPasswordSchema>) {
    setIsSubmitting(true);
    try {
      const result = await resetPassword(values.token, values.password);
      if (result.success) {
        toast({
          title: 'Senha redefinida!',
          description: result.message,
        });
        setTimeout(() => router.push('/login'), 2000);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.message,
        });
      }
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Ocorreu um erro. Por favor, tente novamente.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Token Inválido</CardTitle>
          <CardDescription>
            O link de recuperação é inválido ou expirou.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password">
            <Button className="w-full">Solicitar Novo Link</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold">Nova Senha</CardTitle>
        <CardDescription>
          Digite sua nova senha
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <input type="hidden" {...form.register('token')} />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                            <Input 
                              id="password" 
                              type="password" 
                              placeholder="Digite sua nova senha"
                              {...field} 
                            />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-2">
                          Mínimo 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial
                        </p>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Redefinir Senha"}
                </Button>
                <div className="mt-4 text-center text-sm">
                    <Link href="/login" className="underline">
                        Voltar para Login
                    </Link>
                </div>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

