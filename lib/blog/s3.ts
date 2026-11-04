import crypto from 'node:crypto'
import { MAX_UPLOAD_BYTES, UPLOAD_MIME_TYPES } from './types'

function getS3Config() {
  const accessKeyId = process.env.ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.REGION || process.env.AWS_REGION || 'ap-south-1'
  const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || process.env.BUCKET_NAME || 'blogs-neo'

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3 credentials (ACCESS_KEY_ID, SECRET_ACCESS_KEY) are not configured in environment.')
  }

  return { accessKeyId, secretAccessKey, region, bucket }
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest()
}

function hash(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function getSigningKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac('AWS4' + secret, dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  return hmac(kService, 'aws4_request')
}

export interface PresignedUploadResult {
  uploadUrl: string
  canonicalUrl: string
  key: string
  headers: Record<string, string>
}

/**
 * Generates an AWS S3 presigned PUT URL for direct client-to-S3 uploads.
 */
export function generatePresignedUploadUrl(
  filename: string,
  contentType: string,
  fileSize: number
): PresignedUploadResult {
  if (fileSize > MAX_UPLOAD_BYTES) {
    throw new Error(`File size exceeds maximum allowed limit of 5 MB.`)
  }

  if (!UPLOAD_MIME_TYPES.includes(contentType.toLowerCase())) {
    throw new Error(`Unsupported MIME type: ${contentType}. Allowed: JPEG, PNG, WEBP, GIF, AVIF.`)
  }

  const { accessKeyId, secretAccessKey, region, bucket } = getS3Config()

  // Generate unique object key: blogs/YYYY/MM/<uuid>.<ext>
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const ext = filename.split('.').pop()?.toLowerCase() || 'webp'
  const uniqueId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`
  const key = `blogs/${year}/${month}/${uniqueId}.${ext}`

  const host = `${bucket}.s3.${region}.amazonaws.com`
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const expiresIn = 300 // 5 minutes

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`

  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  }

  const canonicalQueryString = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&')

  const canonicalUri = '/' + key.split('/').map(encodeURIComponent).join('/')
  const canonicalHeaders = `host:${host}\n`
  const signedHeaders = 'host'

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n')

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3')
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex')

  const uploadUrl = `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`
  const canonicalUrl = `https://${host}${canonicalUri}`

  return {
    uploadUrl,
    canonicalUrl,
    key,
    headers: {
      'Content-Type': contentType,
    },
  }
}

export function extractS3ErrorMessage(errorText: string): string {
  try {
    const codeMatch = errorText.match(/<Code>(.*?)<\/Code>/i)
    const msgMatch = errorText.match(/<Message>(.*?)<\/Message>/i)
    if (codeMatch || msgMatch) {
      const code = codeMatch ? codeMatch[1] : ''
      const msg = msgMatch ? msgMatch[1] : ''
      return [code, msg].filter(Boolean).join(': ')
    }
  } catch {}
  return errorText.slice(0, 200)
}

/**
 * Direct server-to-S3 upload (no CORS required on S3 bucket).
 */
export async function uploadToS3(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<{ canonicalUrl: string; key: string }> {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error(`File size exceeds maximum allowed limit of 5 MB.`)
  }

  if (!UPLOAD_MIME_TYPES.includes(contentType.toLowerCase())) {
    throw new Error(`Unsupported MIME type: ${contentType}. Allowed: JPEG, PNG, WEBP, GIF, AVIF.`)
  }

  const { accessKeyId, secretAccessKey, region, bucket } = getS3Config()

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const ext = filename.split('.').pop()?.toLowerCase() || 'webp'
  const uniqueId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`
  const key = `blogs/${year}/${month}/${uniqueId}.${ext}`

  const host = `${bucket}.s3.${region}.amazonaws.com`
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const canonicalUri = '/' + key.split('/').map(encodeURIComponent).join('/')
  const payloadHash = hash(buffer)

  const headersToSign: Record<string, string> = {
    'content-length': String(buffer.length),
    'content-type': contentType,
    'host': host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  }

  const sortedKeys = Object.keys(headersToSign).sort()
  const canonicalHeaders = sortedKeys
    .map((k) => `${k}:${headersToSign[k].trim()}\n`)
    .join('')
  const signedHeaders = sortedKeys.join(';')

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join('\n')

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3')
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex')

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: {
      'Content-Length': String(buffer.length),
      'Content-Type': contentType,
      Host: host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: authHeader,
    },
    body: new Uint8Array(buffer),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('AWS S3 PUT upload error:', res.status, errorText)
    throw new Error(`AWS S3 error (${res.status}): ${extractS3ErrorMessage(errorText)}`)
  }

  const canonicalUrl = `https://${host}${canonicalUri}`
  return { canonicalUrl, key }
}

/**
 * Save image locally in public/uploads/blogs/... as fallback
 */
export async function saveLocalUpload(
  buffer: Buffer,
  filename: string
): Promise<{ canonicalUrl: string; key: string }> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const ext = filename.split('.').pop()?.toLowerCase() || 'webp'
  const uniqueId = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`
  const relPath = `uploads/blogs/${year}/${month}/${uniqueId}.${ext}`
  const fullPath = path.join(process.cwd(), 'public', relPath)

  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, buffer)

  return {
    canonicalUrl: `/${relPath.replace(/\\/g, '/')}`,
    key: relPath,
  }
}

/**
 * Safely delete an object from S3 if configured.
 */
export async function deleteS3Object(objectUrlOrKey: string): Promise<boolean> {
  try {
    const { accessKeyId, secretAccessKey, region, bucket } = getS3Config()
    const host = `${bucket}.s3.${region}.amazonaws.com`

    let key = objectUrlOrKey
    if (key.startsWith('http://') || key.startsWith('https://')) {
      const parsed = new URL(key)
      if (parsed.hostname !== host && parsed.hostname !== `${bucket}.s3.amazonaws.com`) {
        // Not from this bucket, ignore deletion
        return false
      }
      key = parsed.pathname.replace(/^\/+/, '')
    }

    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    const canonicalUri = '/' + key.split('/').map(encodeURIComponent).join('/')
    const payloadHash = hash('')

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

    const canonicalRequest = [
      'DELETE',
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n')

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      hash(canonicalRequest),
    ].join('\n')

    const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3')
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign, 'utf8')
      .digest('hex')

    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

    const res = await fetch(`https://${host}${canonicalUri}`, {
      method: 'DELETE',
      headers: {
        Host: host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        Authorization: authHeader,
      },
    })

    return res.status === 204 || res.status === 200
  } catch (error) {
    console.error('Error deleting S3 object:', error)
    return false
  }
}
