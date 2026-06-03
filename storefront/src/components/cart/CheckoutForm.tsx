'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useCartStore } from '@/store/cartStore'

interface CheckoutFormState {
  customerEmail: string
  customerFirstName: string
  customerLastName: string
  customerPhone: string
  line1: string
  line2: string
  district: string
  city: string
  postalCode: string
  country: string
  notes: string
}

interface OrderResponse {
  orderNumber: string
}

interface PaymentResponse {
  paymentPageUrl: string | null
}

const initialFormState: CheckoutFormState = {
  customerEmail: '',
  customerFirstName: '',
  customerLastName: '',
  customerPhone: '',
  line1: '',
  line2: '',
  district: '',
  city: '',
  postalCode: '',
  country: 'Turkiye',
  notes: '',
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String(payload.message)
        : `Istek basarisiz oldu: ${response.status}`

    throw new Error(message)
  }

  return payload as T
}

export default function CheckoutForm() {
  const sessionId = useCartStore((state) => state.sessionId)
  const itemCount = useCartStore((state) => state.items.length)
  const [form, setForm] = useState<CheckoutFormState>(initialFormState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateField(field: keyof CheckoutFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (itemCount === 0 || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const order = await readJson<OrderResponse>(
        await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            customerEmail: form.customerEmail.trim(),
            customerFirstName: form.customerFirstName.trim(),
            customerLastName: form.customerLastName.trim(),
            customerPhone: form.customerPhone.trim(),
            shippingAddress: {
              line1: form.line1.trim(),
              line2: form.line2.trim() || null,
              district: form.district.trim(),
              city: form.city.trim(),
              postalCode: form.postalCode.trim() || null,
              country: form.country.trim(),
            },
            notes: form.notes.trim() || null,
          }),
        }),
      )

      const origin = window.location.origin
      const payment = await readJson<PaymentResponse>(
        await fetch('/api/payments/initiate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderNumber: order.orderNumber,
            provider: 'IYZICO',
            successUrl: `${origin}/payment/success`,
            cancelUrl: `${origin}/payment/cancel`,
          }),
        }),
      )

      if (!payment.paymentPageUrl) {
        throw new Error('Odeme sayfasi olusturulamadi.')
      }

      window.location.href = payment.paymentPageUrl
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Siparis olusturulurken bir hata olustu.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <form id="checkout-form" onSubmit={handleSubmit} className="mt-6 space-y-5 border-t border-line pt-6">
      <div>
        <h3 className="font-serif text-[17px] font-semibold text-brown">
          Teslimat Bilgileri
        </h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Odeme iyzico guvenli odeme sayfasinda tamamlanacak.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
        <TextField
          id="checkout-first-name"
          label="Ad"
          value={form.customerFirstName}
          onChange={(value) => updateField('customerFirstName', value)}
          required
          autoComplete="given-name"
        />
        <TextField
          label="Soyad"
          value={form.customerLastName}
          onChange={(value) => updateField('customerLastName', value)}
          required
          autoComplete="family-name"
        />
      </div>

      <TextField
        id="checkout-email"
        label="E-posta"
        type="email"
        value={form.customerEmail}
        onChange={(value) => updateField('customerEmail', value)}
        required
        autoComplete="email"
      />

      <TextField
        label="Telefon"
        type="tel"
        value={form.customerPhone}
        onChange={(value) => updateField('customerPhone', value)}
        required
        autoComplete="tel"
      />

      <TextAreaField
        label="Adres"
        value={form.line1}
        onChange={(value) => updateField('line1', value)}
        required
        autoComplete="street-address"
      />

      <TextField
        label="Adres devam"
        value={form.line2}
        onChange={(value) => updateField('line2', value)}
        autoComplete="address-line2"
      />

      <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
        <TextField
          label="Ilce"
          value={form.district}
          onChange={(value) => updateField('district', value)}
          required
          autoComplete="address-level2"
        />
        <TextField
          label="Il"
          value={form.city}
          onChange={(value) => updateField('city', value)}
          required
          autoComplete="address-level1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 max-[520px]:grid-cols-1">
        <TextField
          label="Posta kodu"
          value={form.postalCode}
          onChange={(value) => updateField('postalCode', value)}
          autoComplete="postal-code"
        />
        <TextField
          label="Ulke"
          value={form.country}
          onChange={(value) => updateField('country', value)}
          required
          autoComplete="country-name"
        />
      </div>

      <TextAreaField
        label="Siparis notu"
        value={form.notes}
        onChange={(value) => updateField('notes', value)}
      />

      {error ? (
        <p className="rounded-[12px] border border-rose/25 bg-rose/10 px-3 py-2 text-[12.5px] font-semibold text-rose-dk">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || itemCount === 0}
        className="w-full rounded-[14px] bg-brown py-4 text-[15px] font-bold text-white transition-colors hover:bg-brown-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Yonlendiriliyor...' : 'iyzico ile Ode'}
      </button>
    </form>
  )
}

interface TextFieldProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  autoComplete?: string
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  autoComplete,
}: TextFieldProps) {
  return (
    <label className="block text-[12.5px] font-semibold text-brown-2">
      <span>{label}</span>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-[14px] font-semibold text-brown outline-none transition-colors placeholder:text-muted focus:border-rose"
      />
    </label>
  )
}

interface TextAreaFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  autoComplete?: string
}

function TextAreaField({
  label,
  value,
  onChange,
  required = false,
  autoComplete,
}: TextAreaFieldProps) {
  return (
    <label className="block text-[12.5px] font-semibold text-brown-2">
      <span>{label}</span>
      <textarea
        required={required}
        value={value}
        autoComplete={autoComplete}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full resize-none rounded-[12px] border border-line bg-white px-3 py-2.5 text-[14px] font-semibold text-brown outline-none transition-colors placeholder:text-muted focus:border-rose"
      />
    </label>
  )
}
