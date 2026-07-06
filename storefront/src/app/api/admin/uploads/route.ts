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

type AdminVerdict = { ok: true } | { ok: false; status: number; message: string }

// Bu route dosyayi backend'e ugramadan yerel diske yazdigindan, yetkiyi backend'e IMZA
// dogrulatarak kontrol ederiz. isAdminToken() token'i imzasiz cozdugu icin tek basina yeterli
// degil (sahte "roles: ADMIN" token'i ile yukleme yapilabilirdi). Gecici backend hatalarinda
// (soguk baslangic / yeniden dagitim) bir kez daha denenir; boylece anlik bir kesinti yanlissa
// "yetki reddedildi" gibi gorunmez. Hata turleri ayri ayri, anlasilir Turkce mesajlarla donulur.
async function verifyAdmin(token: string): Promise<AdminVerdict> {
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response
    try {
      res = await fetch(buildBackendUrl('/api/v1/me'), {
        cache: 'no-store',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
    } catch {
      if (attempt === 0) continue
      return { ok: false, status: 503, message: 'Sunucuya ulaşılamadı. Lütfen birkaç saniye sonra tekrar deneyin.' }
    }

    // Backend gecici olarak yanit veremiyorsa (5xx) bir kez daha dene.
    if (res.status >= 500) {
      if (attempt === 0) continue
      return { ok: false, status: 503, message: 'Sunucu şu anda yanıt vermiyor. Lütfen biraz sonra tekrar deneyin.' }
    }

    // Token gecersiz/suresi dolmus: oturum sorunu — kullaniciyi tekrar girise yonlendir.
    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: 401, message: 'Oturumunuz sona ermiş olabilir. Lütfen çıkış yapıp yeniden giriş yapın, ardından tekrar deneyin.' }
    }

    if (!res.ok) {
      return { ok: false, status: 502, message: 'Yükleme yetkisi doğrulanamadı. Lütfen tekrar deneyin.' }
    }

    const profile = (await res.json().catch(() => null)) as { roles?: string[] } | null
    if (!Array.isArray(profile?.roles) || !profile.roles.includes('ADMIN')) {
      return { ok: false, status: 403, message: 'Bu işlem için admin yetkisi gerekli.' }
    }

    return { ok: true }
  }
  return { ok: false, status: 503, message: 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.' }
}

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ message: 'Oturum bulunamadı. Lütfen giriş yapın.' }, { status: 401 })
  }

  const verdict = await verifyAdmin(token)
  if (!verdict.ok) {
    return NextResponse.json({ message: verdict.message }, { status: verdict.status })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'Görsel dosyası bulunamadı.' }, { status: 400 })
  }

  const extension = ALLOWED_TYPES.get(file.type)

  if (!extension) {
    return NextResponse.json({ message: 'Yalnızca JPG, PNG ve WEBP görseller yüklenebilir. (Telefon fotoğrafları HEIC olabilir; lütfen JPG olarak yükleyin.)' }, { status: 400 })
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ message: 'Görsel en fazla 5MB olabilir. Lütfen daha küçük bir görsel yükleyin.' }, { status: 400 })
  }

  const uploadDir = getProductUploadDir()
  try {
    await mkdir(uploadDir, { recursive: true })
    const baseName = safeFilePart(file.name.replace(/\.[^.]+$/, '')) || 'product'
    const fileName = `${Date.now()}-${baseName}.${extension}`
    const bytes = await file.arrayBuffer()
    await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes))

    return NextResponse.json({ imageUrl: getProductUploadUrl(fileName) })
  } catch {
    // Disk yazimi basarisiz (orn. kalici disk bagli degil / izin sorunu).
    return NextResponse.json(
      { message: 'Görsel sunucuya kaydedilemedi. Lütfen tekrar deneyin; sorun sürerse yöneticinize bildirin.' },
      { status: 500 },
    )
  }
}
