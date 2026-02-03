"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";

interface PricingPlan {
    id: string;
    name: string;
    price: number;
    yearlyPrice: number;
    period: string;
    features: string[];
    description: string;
    buttonText: string;
    href: string;
    isPopular: boolean;
}

interface PricingProps {
    plans: PricingPlan[];
    title?: string;
    description?: string;
}

export function Pricing({
    plans,
    title = "Preços Simples e Transparentes",
    description = "Escolha o plano que melhor se adapta às suas necessidades.\nTodos os planos incluem acesso à plataforma e suporte dedicado.",
}: PricingProps) {
    const [isMonthly, setIsMonthly] = useState(true);
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const switchRef = useRef<HTMLButtonElement>(null);

    const handleToggle = (checked: boolean) => {
        setIsMonthly(!checked);
        if (checked && switchRef.current) {
            const rect = switchRef.current.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;

            confetti({
                particleCount: 50,
                spread: 60,
                origin: {
                    x: x / window.innerWidth,
                    y: y / window.innerHeight,
                },
                colors: [
                    "hsl(var(--primary))",
                    "hsl(var(--accent))",
                    "hsl(var(--secondary))",
                    "hsl(var(--muted))",
                ],
                ticks: 200,
                gravity: 1.2,
                decay: 0.94,
                startVelocity: 30,
                shapes: ["circle"],
            });
        }
    };

    return (
        <div className="container py-20">
            <div className="text-center space-y-4 mb-12">
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    {title}
                </h2>
                <p className="text-muted-foreground text-lg whitespace-pre-line">
                    {description}
                </p>
            </div>

            <div className="flex justify-center items-center gap-3 mb-10">
                <span className={cn("text-sm font-medium", isMonthly && "text-foreground", !isMonthly && "text-muted-foreground")}>
                    Mensal
                </span>
                <Label>
                    <Switch
                        ref={switchRef as any}
                        checked={!isMonthly}
                        onCheckedChange={handleToggle}
                        className="relative"
                    />
                </Label>
                <span className={cn("text-sm font-medium", !isMonthly && "text-foreground", isMonthly && "text-muted-foreground")}>
                    Anual <span className="text-primary">(Economize 20%)</span>
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan, index) => (
                    <motion.div
                        key={plan.id}
                        initial={{ y: 50, opacity: 1 }}
                        whileInView={
                            isDesktop
                                ? {
                                    y: plan.isPopular ? -20 : 0,
                                    opacity: 1,
                                    x: index === 2 ? -30 : index === 0 ? 30 : 0,
                                    scale: index === 0 || index === 2 ? 0.94 : 1.0,
                                }
                                : {}
                        }
                        viewport={{ once: true }}
                        transition={{
                            duration: 1.6,
                            type: "spring",
                            stiffness: 100,
                            damping: 30,
                            delay: 0.4,
                            opacity: { duration: 0.5 },
                        }}
                        className={cn(
                            `rounded-2xl border-[1px] p-6 bg-background text-center lg:flex lg:flex-col lg:justify-center relative`,
                            plan.isPopular ? "border-primary border-2" : "border-border",
                            "flex flex-col",
                            !plan.isPopular && "mt-5",
                            index === 0 || index === 2
                                ? "z-0 transform translate-x-0 translate-y-0"
                                : "z-10"
                        )}
                    >
                        {plan.isPopular && (
                            <div className="absolute top-0 right-0 bg-primary py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                                <Star className="text-primary-foreground h-4 w-4 fill-current" />
                                <span className="text-primary-foreground ml-1 font-sans font-semibold text-xs">
                                    Popular
                                </span>
                            </div>
                        )}
                        <div className="flex-1 flex flex-col">
                            <p className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
                                {plan.name}
                            </p>
                            <div className="mt-6 flex items-center justify-center gap-x-2">
                                <span className="text-5xl font-bold tracking-tight text-foreground">
                                    <NumberFlow
                                        value={isMonthly ? plan.price : plan.yearlyPrice}
                                        format={{
                                            style: "currency",
                                            currency: "BRL",
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        }}
                                        transformTiming={{
                                            duration: 500,
                                            easing: "ease-out",
                                        }}
                                        willChange
                                    />
                                </span>
                                <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                                    / {plan.period}
                                </span>
                            </div>

                            <p className="text-xs leading-5 text-muted-foreground mt-2">
                                {isMonthly ? "cobrado mensalmente" : "cobrado anualmente"}
                            </p>

                            <ul className="mt-8 gap-3 flex flex-col">
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                        <span className="text-left">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <hr className="w-full my-6" />

                            <Link
                                href={plan.href}
                                className={cn(
                                    buttonVariants({
                                        variant: plan.isPopular ? "default" : "outline",
                                    }),
                                    "group relative w-full gap-2 overflow-hidden text-base font-semibold tracking-tight",
                                    "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-1",
                                    !plan.isPopular && "hover:bg-primary hover:text-primary-foreground"
                                )}
                            >
                                {plan.buttonText}
                            </Link>
                            <p className="mt-4 text-xs leading-5 text-muted-foreground">
                                {plan.description}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
