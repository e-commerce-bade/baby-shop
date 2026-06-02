import type { ReactNode } from 'react'

interface Props {
  num: number
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export default function CheckoutSection({ num, title, subtitle, action, children }: Props) {
  return (
    <section className="rounded-[18px] border border-line bg-white p-6 max-[680px]:p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose text-[12px] font-bold text-white">
            {num}
          </span>
          <div>
            <h2 className="font-serif text-[18px] font-semibold leading-snug text-brown">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0 text-[12.5px]">{action}</div>}
      </div>
      {children}
    </section>
  )
}
