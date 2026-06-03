import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { AUTH_COOKIE_NAME } from '@/lib/api/auth-cookie'

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

function safeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export async function POST(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.json({ message: 'Authentication required' }, { status: 401 })
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

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products')
  await mkdir(uploadDir, { recursive: true })

  const baseName = safeFilePart(file.name.replace(/\.[^.]+$/, '')) || 'product'
  const fileName = `${Date.now()}-${baseName}.${extension}`
  const bytes = await file.arrayBuffer()

  await writeFile(path.join(uploadDir, fileName), Buffer.from(bytes))

  return NextResponse.json({
    imageUrl: `/uploads/products/${fileName}`,
  })
}
