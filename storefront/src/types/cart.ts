export interface CartLineItem {
  id: string
  cartItemId: number
  productId: number
  variantId: number
  slug: string
  productName: string
  variantLabel: string
  primaryImageUrl?: string | null
  price: string
  currency: string
  quantity: number
}

export interface CustomerAddress {
  id: number
  label: string | null
  recipientFirstName: string
  recipientLastName: string
  phoneNumber: string | null
  line1: string
  line2: string | null
  district: string | null
  city: string
  postalCode: string | null
  country: string
  isDefault: boolean
}

export interface CheckoutSummary {
  cartId: number
  sessionId: string
  items: CartLineItem[]
  itemCount: number
  totalQuantity: number
  subtotal: number | string
  shippingAmount: number | string
  discountAmount: number | string
  totalAmount: number | string
  currency: string
  // Ücretsiz kargo: backend hesaplar, frontend yeniden türetmez
  freeShippingThreshold: number | string | null
  remainingAmountForFreeShipping: number | string | null
  eligibleForFreeShipping: boolean
  // Checkout durumu
  readyForCheckout: boolean
  checkoutBlockedReason: string | null
  // Kayıtlı kullanıcı varsayılan adres (opsiyonel gösterim)
  defaultShippingAddress: CustomerAddress | null
}

export interface CartState {
  sessionId: string
  items: CartLineItem[]
  isOpen: boolean
  isSyncing: boolean
  hasHydrated: boolean
  checkoutSummary: CheckoutSummary | null
  // Sepet islemi (ekle/cikar/adet) basarisiz olursa kullaniciya gosterilecek mesaj.
  cartError: string | null
  clearCartError: () => void
  hydrateCart: () => Promise<void>
  refreshCheckoutSummary: () => Promise<void>
  addItem: (item: Omit<CartLineItem, 'id' | 'cartItemId'> & { quantity?: number }) => Promise<void>
  removeItem: (id: string) => Promise<void>
  // Optimistik + debounce: UI hemen guncellenir, sunucu senkronu geciktirilir.
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  startNewCart: () => void
  openDrawer: () => void
  closeDrawer: () => void
}
