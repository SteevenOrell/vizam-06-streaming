import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 ease-swift active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-[1.15em] [&_svg]:w-[1.15em] [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary: "bg-ember-400 text-ink-950 hover:bg-ember-300 hover:shadow-ember",
  secondary: "bg-white/12 text-bone-50 ring-1 ring-inset ring-white/15 backdrop-blur-md hover:bg-white/20",
  ghost: "text-bone-200 hover:bg-white/10 hover:text-bone-50",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-7 text-base",
};

export function buttonClasses({ variant = "primary", size = "md", className = "" }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

type CommonProps = { variant?: Variant; size?: Size; icon?: ReactNode; children: ReactNode; className?: string };

export function Button({ variant, size, icon, children, className, type = "button", ...rest }: CommonProps & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClasses({ variant, size, className })} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, icon, children, className, ...rest }: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
