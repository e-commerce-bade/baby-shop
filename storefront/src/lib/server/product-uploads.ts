import path from 'node:path'

export const PRODUCT_UPLOAD_URL_PREFIX = '/uploads/products'

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function safeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function getProductUploadDir() {
  if (process.env.PRODUCT_UPLOAD_DIR) {
    return process.env.PRODUCT_UPLOAD_DIR
  }

  if (process.env.UPLOAD_DIR) {
    return path.join(process.env.UPLOAD_DIR, 'products')
  }

  return path.join(process.cwd(), '.uploads', 'products')
}

export function getLegacyPublicProductUploadDir() {
  return path.join(process.cwd(), 'public', 'uploads', 'products')
}

export function isSafeProductUploadFileName(fileName: string) {
  return /^[0-9]+-[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(fileName)
}

export function getProductUploadUrl(fileName: string) {
  return `${PRODUCT_UPLOAD_URL_PREFIX}/${fileName}`
}

export function getProductUploadContentType(fileName: string) {
  const extension = path.extname(fileName).slice(1).toLowerCase()
  return CONTENT_TYPES[extension] ?? 'application/octet-stream'
}
