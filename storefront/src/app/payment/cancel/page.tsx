import { Suspense } from 'react'
import PaymentCancelContent from './PaymentCancelContent'

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <PaymentCancelContent />
    </Suspense>
  )
}
