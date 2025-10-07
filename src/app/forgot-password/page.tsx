'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from 'react'
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
import { ForgotPasswordSchema } from "@/lib/schemas"
import { requestPasswordReset } from "./actions"

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(values: z.infer<typeof ForgotPasswordSchema>) {
    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(values.email);
      if (result.success) {
        setEmailSent(true);
        toast({
          title: 'Email enviado!',
          description: result.message,
        });
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

  if (emailSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Email Enviado ✓</CardTitle>
          <CardDescription>
            Verifique sua caixa de entrada e spam. O link expira em 1 hora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Enviamos um link de recuperação para seu email.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Voltar para Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
        <CardDescription>
          Digite seu email para receber um link de recuperação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input 
                              id="email" 
                              type="email" 
                              placeholder="seu@email.com" 
                              {...field} 
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Enviar Link"}
                </Button>
                <div className="mt-4 text-center text-sm">
                    Lembrou sua senha?{" "}
                    <Link href="/login" className="underline">
                        Faça login
                    </Link>
                </div>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}

