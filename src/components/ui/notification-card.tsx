import * as React from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface NotificationCardProps {
  imageSrc: string;
  alt: string;
  className?: string;
}

export function NotificationCard({
  imageSrc,
  alt,
  className,
}: NotificationCardProps) {
  return (
    <div className={cn("relative group transition-all duration-500", className)}>
      <Image
        src={imageSrc}
        alt={alt}
        width={1024}
        height={280}
        className="w-full h-auto max-w-[360px] rounded-[22px] shadow-lg hover:scale-[1.02] transition-transform duration-200 cursor-default select-none"
        priority
      />
    </div>
  );
}
