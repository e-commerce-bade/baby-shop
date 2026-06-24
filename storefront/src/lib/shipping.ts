import { formatPrice } from '@/lib/utils'

/**
 * Ücretsiz kargo eşiği ve sabit kargo ücreti için yerel VARSAYILAN değerler.
 * Otorite backend'deki store_settings tablosudur (admin panelden düzenlenir);
 * bunlar yalnızca backend verisi henüz gelmeden gösterilecek fallback'lerdir.
 */
export const FREE_SHIPPING_THRESHOLD = 1500
export const DEFAULT_SHIPPING_FEE = 49.9

/** Eşiği "₺1.500" gibi para birimi formatında döndürür (varsayılan değerle). */
export function formatFreeShippingThreshold(currency = 'TRY') {
  return formatPrice(FREE_SHIPPING_THRESHOLD, currency)
}
