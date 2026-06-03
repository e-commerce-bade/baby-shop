const STEPS = [
  { num: 1, label: 'Sepet' },
  { num: 2, label: 'Checkout' },
  { num: 3, label: 'Ödeme' },
  { num: 4, label: 'Onay' },
]

interface Props {
  current?: number
}

export default function CheckoutSteps({ current = 2 }: Props) {
  return (
    <nav aria-label="Checkout adımları" className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done    = step.num < current
        const active  = step.num === current
        const pending = step.num > current

        return (
          <div key={step.num} className="flex items-center">
            {/* Dot + label */}
            <div className="flex flex-col items-center gap-1">
              <span
                className={[
                  'grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold transition-colors',
                  done   ? 'bg-rose text-white'                        : '',
                  active ? 'bg-rose text-white ring-2 ring-rose/30'    : '',
                  pending? 'border border-line bg-cream-2 text-muted'  : '',
                ].join(' ')}
              >
                {done ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.num
                )}
              </span>
              <span
                className={[
                  'hidden text-[10.5px] font-semibold leading-none sm:block',
                  active  ? 'text-brown'  : '',
                  done    ? 'text-rose-dk' : '',
                  pending ? 'text-muted'  : '',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={[
                  'mx-2 mb-4 h-px w-10 max-[480px]:w-5',
                  step.num < current ? 'bg-rose' : 'bg-line',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
