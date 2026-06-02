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

export interface CheckoutSummary {
  cartId: number
  sessionId: string
  totalQuantity: number
  subtotal: string
  shippingAmount: string
  discountAmount: string
  totalAmount: string
  currency: string
  readyForCheckout: boolean
}

export interface CartState {
  sessionId: string
  items: CartLineItem[]
  isOpen: boolean
  isSyncing: boolean
  hydrateCart: () => Promise<void>
  addItem: (item: Omit<CartLineItem, 'id' | 'cartItemId'> & { quantity?: number }) => Promise<void>
  removeItem: (id: string) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  clearCart: () => void
  openDrawer: () => void
  closeDrawer: () => void
}
