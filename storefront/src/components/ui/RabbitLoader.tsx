function RabbitSVG({
  fill,
  stroke,
  eyeFill,
}: {
  fill: string
  stroke: string
  eyeFill: string
}) {
  return (
    <svg
      viewBox="0 0 44 62"
      width="44"
      height="62"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      {/* Left ear */}
      <ellipse cx="14" cy="14" rx="6.5" ry="12" fill={fill} stroke={stroke} strokeWidth="1.5" />
      {/* Right ear */}
      <ellipse cx="30" cy="14" rx="6.5" ry="12" fill={fill} stroke={stroke} strokeWidth="1.5" />
      {/* Inner left ear */}
      <ellipse cx="14" cy="14" rx="3.5" ry="7.5" fill={eyeFill} />
      {/* Inner right ear */}
      <ellipse cx="30" cy="14" rx="3.5" ry="7.5" fill={eyeFill} />
      {/* Head */}
      <circle cx="22" cy="35" r="16" fill={fill} stroke={stroke} strokeWidth="1.5" />
      {/* Body */}
      <ellipse cx="22" cy="54" rx="14" ry="10" fill={fill} stroke={stroke} strokeWidth="1.5" />
      {/* Left eye */}
      <circle cx="16.5" cy="31.5" r="2.5" fill={eyeFill} />
      <circle cx="17.2" cy="30.8" r="1" fill="white" />
      {/* Right eye */}
      <circle cx="27.5" cy="31.5" r="2.5" fill={eyeFill} />
      <circle cx="28.2" cy="30.8" r="1" fill="white" />
      {/* Nose */}
      <ellipse cx="22" cy="37.5" rx="2.2" ry="1.8" fill={eyeFill} />
      {/* Mouth */}
      <path d="M20 39.5 Q22 41.5 24 39.5" stroke={eyeFill} strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export default function RabbitLoader() {
  const DURATION = '2.2s'

  return (
    <div className="flex items-end gap-5">
      {/* Pink rabbit */}
      <div className="relative" style={{ width: 44, height: 62 }}>
        {/* Outline layer (always visible) */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <RabbitSVG fill="transparent" stroke="#EDD5D8" eyeFill="#EDD5D8" />
        </div>
        {/* Colored fill layer (rises from bottom) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            animation: `rabbit-fill ${DURATION} ease-in-out infinite`,
          }}
        >
          <RabbitSVG fill="#F9A8C0" stroke="#F472A8" eyeFill="#BE185D" />
        </div>
      </div>

      {/* Blue rabbit */}
      <div className="relative" style={{ width: 44, height: 62 }}>
        {/* Outline layer */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <RabbitSVG fill="transparent" stroke="#BFDBFE" eyeFill="#BFDBFE" />
        </div>
        {/* Colored fill layer (delayed) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            animation: `rabbit-fill ${DURATION} ease-in-out infinite`,
            animationDelay: '0.8s',
          }}
        >
          <RabbitSVG fill="#93C5FD" stroke="#60A5FA" eyeFill="#1D4ED8" />
        </div>
      </div>
    </div>
  )
}
