interface Props {
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}

export default function QuantityControl({
  value,
  min = 1,
  max = 99,
  onChange,
}: Props) {
  return (
    <div className="inline-flex overflow-hidden rounded-[10px] border border-line bg-white">
      <button
        type="button"
        aria-label="Azalt"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="grid h-[42px] w-10 place-items-center text-xl text-brown-2 transition-colors hover:bg-cream-2 hover:text-brown disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>
      <span className="grid min-w-[46px] place-items-center border-x border-line text-[15px] font-bold text-brown">
        {value}
      </span>
      <button
        type="button"
        aria-label="Artır"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="grid h-[42px] w-10 place-items-center text-xl text-brown-2 transition-colors hover:bg-cream-2 hover:text-brown disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}
