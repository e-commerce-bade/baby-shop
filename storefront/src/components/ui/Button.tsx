import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variants: Record<Variant, string> = {
  primary:
    'bg-rose text-white shadow-[0_10px_22px_-10px_rgba(197,127,123,.8)] hover:bg-rose-dk',
  ghost:
    'bg-white text-brown border border-line hover:bg-cream-2',
}

export default function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-pill px-[26px] py-[13px] text-sm font-bold transition-[transform,background-color] duration-[220ms] hover:-translate-y-0.5',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  )
}
