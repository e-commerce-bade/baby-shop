// Magaza ayarlari (odeme secenekleri, minimum sepet tutari, kargo firmalari, banka bilgileri).
// Otorite backend'deki store_settings tablosudur; buradaki tip hem storefront hem admin tarafinda
// kullanilir.

export type PaymentMethod = 'CARD' | 'COD' | 'EFT'

export interface StoreSettings {
  freeShippingThreshold: number | string | null
  shippingFee: number | string | null
  minimumOrderAmount: number | string | null
  cardEnabled: boolean
  codEnabled: boolean
  codSurcharge: number | string | null
  bankTransferEnabled: boolean
  bankTransferIban: string | null
  bankTransferAccountName: string | null
  bankTransferBankName: string | null
  shippingCarriers: string[]
  currency: string
  updatedAt?: string
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: 'Kredi / Banka Kartı',
  COD: 'Kapıda Nakit Ödeme',
  EFT: 'EFT / Havale',
}

/** Storefront tarafinda magaza ayarlarini ceker; hata olursa null doner (cagiran fallback uygular). */
export async function fetchStoreSettings(): Promise<StoreSettings | null> {
  try {
    const res = await fetch('/api/store-settings', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return (await res.json()) as StoreSettings
  } catch {
    return null
  }
}

export function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0
  return typeof value === 'number' ? value : parseFloat(value)
}
