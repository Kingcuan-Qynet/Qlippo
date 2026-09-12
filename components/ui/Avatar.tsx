import Image from "next/image";
import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  size = 40,
  className
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={name}
    >
      {initial}
    </div>
  );
}
