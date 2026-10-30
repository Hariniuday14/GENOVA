import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "subtle";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 " +
  "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent-cyan text-midnight-950 shadow-[0_10px_28px_-14px_rgba(45,212,230,0.7)] " +
    "hover:bg-[#5ee6f4] active:translate-y-px",
  secondary:
    "border border-line-strong bg-midnight-800/70 text-ink hover:border-accent-cyan/40 " +
    "hover:bg-midnight-750 hover:text-white",
  ghost: "text-ink-secondary hover:bg-midnight-800/70 hover:text-ink",
  subtle:
    "border border-transparent bg-midnight-700/40 text-ink-secondary hover:bg-midnight-700/70 hover:text-ink",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[12.5px]",
  md: "h-10 px-4 text-sm",
};

export function buttonStyles(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, icon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonStyles(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

interface LinkButtonProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function LinkButton({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={buttonStyles(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
