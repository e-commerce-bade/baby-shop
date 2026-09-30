// Admin stok kaydi, panelin gosterdigi stok ile birlikte gonderilir (`expectedStockQuantity`). Arada
// bir siparis stogu dusurduyse ya da iptal geri verdiyse sunucu kaydi reddeder (409) ve her varyantin
// guncel stogunu dondurur; panel bu degerleri gosterip yazilan taslaklari korur.
export interface StockConflict {
  variantId: number
  expectedStockQuantity: number
  currentStockQuantity: number
}

// Diger 409 yanitlarinda (orn. ayni beden/renk zaten var) bu alan yoktur; o zaman null doner.
export function readStockConflicts(payload: unknown): StockConflict[] | null {
  const conflicts = (payload as { conflicts?: unknown } | null)?.conflicts
  return Array.isArray(conflicts) && conflicts.length > 0 ? (conflicts as StockConflict[]) : null
}

export const STOCK_CONFLICT_HINT = 'Güncel stok ekranda gösteriliyor; kontrol edip tekrar kaydedin.'
