'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, XCircle } from "lucide-react"
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
import { ClientRegisterSchema } from "@/lib/schemas"
import { registerClient } from "./actions"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: '' })

  const form = useForm<z.infer<typeof ClientRegisterSchema>>({
    resolver: zodResolver(ClientRegisterSchema),
    defaultValues: {
      name: "",
      username: "",
      cpfCnpj: "",
      email: "",
      password: "",
    },
  })

  // Validação de username em tempo real
  const username = form.watch('username')
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus({ checking: false, available: null, message: '' })
      return
    }

    const timer = setTimeout(async () => {
      setUsernameStatus({ checking: true, available: null, message: '' })
      try {
        const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`)
        const data = await response.json()
        setUsernameStatus({
          checking: false,
          available: data.available,
          message: data.message,
        })
      } catch (error) {
        setUsernameStatus({ checking: false, available: false, message: 'Erro ao verificar' })
      }
    }, 500) // Debounce de 500ms

    return () => clearTimeout(timer)
  }, [username])

  async function onSubmit(values: z.infer<typeof ClientRegisterSchema>) {
    setIsSubmitting(true);
    try {
      const result = await registerClient(values);
      if (result.success) {
        toast({
          title: 'Sucesso!',
          description: result.message,
        });
        // Redirect to login after a short delay to allow the user to read the toast
        setTimeout(() => router.push('/login'), 2000);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro no cadastro',
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
            <CardTitle className="text-2xl font-bold">Criar sua Conta</CardTitle>
            <CardDescription>Comece seus 30 dias de teste gratuito.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                     <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Nome Completo</FormLabel>
                              <FormControl>
                                  <Input placeholder="Seu nome completo" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                  <div className="relative">
                                    <Input 
                                      placeholder="seu_username" 
                                      {...field} 
                                      className="pr-10"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      {usernameStatus.checking && (
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                      )}
                                      {!usernameStatus.checking && usernameStatus.available === true && (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      )}
                                      {!usernameStatus.checking && usernameStatus.available === false && (
                                        <XCircle className="h-4 w-4 text-red-500" />
                                      )}
                                    </div>
                                  </div>
                              </FormControl>
                              {usernameStatus.message && (
                                <p className={`text-sm ${usernameStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                                  {usernameStatus.message}
                                </p>
                              )}
                              <FormMessage />
                              <p className="text-xs text-muted-foreground">
                                3-20 caracteres: letras minúsculas, números e underscore (_)
                              </p>
                          </FormItem>
                      )}
                    />
                    <FormField
                    control={form.control}
                    name="cpfCnpj"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>CPF ou CNPJ</FormLabel>
                            <FormControl>
                                <Input placeholder="Seu CPF ou CNPJ para o teste" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="seu@email.com" {...field} />
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
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Criar Conta"}
                    </Button>
                    <div className="mt-4 text-center text-sm">
                        Já tem uma conta?{" "}
                        <Link href="/login" className="underline">
                            Faça login
                        </Link>
                    </div>
                </form>
            </Form>
        </CardContent>
        </Card>
    </main>
  );
}
