import { redirect } from 'next/navigation'

export default function AdminLoginRedirectPage() {
  redirect('/account/login?next=/admin')
}
