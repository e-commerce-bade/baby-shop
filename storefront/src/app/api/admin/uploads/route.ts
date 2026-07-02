import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/api/auth-cookie'
import { buildBackendUrl } from '@/lib/api/backend'
import { getProductUploadDir, getProductUploadUrl, safeFilePart } from '@/lib/server/product-uploads'

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
  }

  // Bu route dosyayi backend'e uğramadan yerel diske yazdigindan, yetkiyi backend'e IMZA
  // dogrulatarak kontrol ederiz. isAdminToken() token'i imzasiz cozdugu icin tek basina yeterli
  // degil (sahte "roles: ADMIN" token'i ile yukleme yapilabilirdi). Backend gecersiz imzada 401 doner.
  let meResponse: Response
  try {
    meResponse = await fetch(buildBackendUrl('/api/v1/me'), {
      cache: 'no-store',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
  } catch {
    return NextResponse.json({ message: 'Yetki doğrulanamadı. Lütfen tekrar deneyin.' }, { status: 503 })
  }

  if (!meResponse.ok) {
    return NextResponse.json({ message: 'Admin privileges required' }, { status: 403 })
  }

  const profile = (await meResponse.json().catch(() => null)) as { roles?: string[] } | null
  if (!Array.isArray(profile?.roles) || !profile.roles.includes('ADMIN')) {
    return NextResponse.json({ message: 'Admin privileges required' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'File is required' }, { status: 400 })
  }

  const extension = ALLOWED_TYPES.get(file.type)

  if (!extension) {
    return NextResponse.json({ message: 'Only JPG, PNG and WEBP images are supported' }, { status: 400 })
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ message: 'Image must be 5MB or smaller' }, { status: 400 })
  }

  const uploadDir = getProductUploadDir()
  await mkdir(uploadDir, { recursive: true })

  const baseName = safeFilePart(file.name.replace(/\.[^.]+$/, '')) || 'product'
  const fileName = `${Date.now()}-${baseName}.${extension}`
  const bytes = await file.arrayBuffer()

  await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes))

  return NextResponse.json({
    imageUrl: getProductUploadUrl(fileName),
  })
}
