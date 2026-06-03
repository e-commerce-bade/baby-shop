import RabbitLoader from '@/components/ui/RabbitLoader'

export default function ProductDetailLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <RabbitLoader />
    </div>
  )
}
