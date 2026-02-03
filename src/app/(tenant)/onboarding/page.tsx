'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, Bot, ShoppingBag, Settings } from 'lucide-react';

const steps = [
    {
        title: 'Bem-vindo ao Vematize!',
        description: 'Sua plataforma de vendas automatizadas no Telegram e Discord.',
        icon: <Bot className="w-16 h-16 text-primary" />,
        content: 'Você acaba de criar sua conta. Agora vamos te mostrar como configurar seu primeiro bot e começar a vender.',
    },
    {
        title: 'Conecte seus Bots',
        description: 'Integração fácil com Telegram e Discord.',
        icon: <Settings className="w-16 h-16 text-primary" />,
        content: 'No painel, você poderá conectar seus bots do Telegram e Discord com apenas alguns cliques. Nós cuidamos de toda a automação para você.',
    },
    {
        title: 'Crie seus Produtos',
        description: 'Venda produtos digitais, acessos e muito mais.',
        icon: <ShoppingBag className="w-16 h-16 text-primary" />,
        content: 'Cadastre seus produtos, defina preços e estoques. O Vematize entrega automaticamente após o pagamento.',
    },
    {
        title: 'Tudo Pronto!',
        description: 'Você está pronto para começar.',
        icon: <CheckCircle2 className="w-16 h-16 text-green-500" />,
        content: 'Explore o dashboard, configure seus métodos de pagamento e comece a vender!',
    },
];

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 dark">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex items-center justify-center">
                        {steps[currentStep].icon}
                    </div>
                    <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
                    <CardDescription>{steps[currentStep].description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                    <p>{steps[currentStep].content}</p>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex space-x-1">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={`h-2 w-2 rounded-full ${index === currentStep ? 'bg-primary' : 'bg-muted'
                                    }`}
                            />
                        ))}
                    </div>
                    <Button onClick={handleNext}>
                        {currentStep === steps.length - 1 ? 'Ir para o Dashboard' : 'Próximo'}
                        {currentStep < steps.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
