'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter } from 'next/navigation'
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
import { ClientLoginSchema } from "@/lib/schemas"
import { unifiedLogin } from "./actions"

export default function ClientLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof ClientLoginSchema>>({
    resolver: zodResolver(ClientLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  async function onSubmit(values: z.infer<typeof ClientLoginSchema>) {
    setIsSubmitting(true);
    try {
      const result = await unifiedLogin(values);
      if (result.success) {
        toast({
          title: result.message,
          description: result.userType === 'admin' 
            ? 'Redirecionando para o painel de administração...'
            : 'Redirecionando para seu painel...',
        });

        // Store user info in session storage
        const userInfo = {
          name: result.name,
          email: result.email,
          userType: result.userType,
          ...(result.subdomain && { subdomain: result.subdomain })
        };
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
        
        // Redireciona para o painel correto
        router.push(result.redirectTo);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro de login',
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold">Vematize</CardTitle>
        <CardDescription>Use seu username para acessar sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                            <Input id="username" type="text" placeholder="seu_username" {...field} />
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
                            <Input id="password" type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Entrar"}
                </Button>
                <div className="space-y-2">
                    <div className="text-center text-sm">
                        <Link href="/forgot-password" className="underline text-muted-foreground hover:text-foreground">
                            Esqueceu sua senha?
                        </Link>
                    </div>
                    <div className="text-center text-sm">
                        Não tem uma conta?{" "}
                        <Link href="/register" className="underline">
                            Crie agora
                        </Link>
                    </div>
                </div>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}
