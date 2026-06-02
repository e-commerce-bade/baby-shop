'use client'

import { useState } from 'react'

/**
 * Promosyon kodu alanı — UI placeholder.
 * Backend'de henüz implement edilmedi (/api/v1/carts/{id}/promo endpoint yok).
 * İleride CartState'e applyPromo() eklenerek bağlanacak.
 */
export default function CartPromoCode() {
  const [code, setCode]       = useState('')
  const [applied, setApplied] = useState(false)

  function handleApply() {
    if (!code.trim()) return
    // TODO: backend entegrasyonu eklendiğinde burada API çağrısı yapılacak
    setApplied(true)
  }

  return (
    <div>
      {applied ? (
        <div className="flex items-center justify-between rounded-[10px] border border-sage bg-[#E2EAD820] px-4 py-2.5">
          <span className="text-[13px] font-semibold text-sage">
            Kod uygulandı: <strong>{code.toUpperCase()}</strong>
          </span>
          <button
            type="button"
            onClick={() => { setCode(''); setApplied(false) }}
            className="text-[11px] font-bold text-muted underline underline-offset-2 hover:text-rose-dk"
          >
            Kaldır
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            placeholder="Promosyon kodu"
            className="flex-1 rounded-[10px] border border-line bg-cream-3 px-4 py-2.5 text-[13px] text-brown placeholder:text-muted focus:border-rose-soft focus:outline-none"
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={!code.trim()}
            className="shrink-0 rounded-[10px] border border-line px-4 py-2.5 text-[13px] font-semibold text-brown-2 transition-colors hover:border-rose-soft hover:bg-rose-tint hover:text-rose-dk disabled:opacity-40"
          >
            Uygula
          </button>
        </div>
      )}
    </div>
  )
}
