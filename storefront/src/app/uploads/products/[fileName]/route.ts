import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import {
  getLegacyPublicProductUploadDir,
  getProductUploadContentType,
  getProductUploadDir,
  isSafeProductUploadFileName,
} from '@/lib/server/product-uploads'

type RouteContext = {
  params: Promise<{ fileName: string }>
}

async function readProductUpload(fileName: string) {
  const paths = [
    path.join(getProductUploadDir(), fileName),
    path.join(getLegacyPublicProductUploadDir(), fileName),
  ]

  for (const filePath of paths) {
    try {
      return await readFile(filePath)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code !== 'ENOENT') {
        throw error
      }
    }
  }

  return null
}

export async function GET(_request: Request, context: RouteContext) {
  const { fileName } = await context.params

  if (!isSafeProductUploadFileName(fileName)) {
    return new NextResponse(null, { status: 404 })
  }

  const file = await readProductUpload(fileName)

  if (!file) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(file, {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': getProductUploadContentType(fileName),
    },
  })
}
