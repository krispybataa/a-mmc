import api from './api'

/**
 * Upload a file to the configured storage bucket via presigned URL.
 *
 * Flow:
 *   1. Ask our backend for a presigned S3 PUT URL  (POST /api/uploads/presign)
 *   2. PUT the file body directly to S3             (no backend bandwidth used)
 *   3. Return the permanent public URL              (stored in DB by the caller)
 *
 * @param {File}   file    - The File object from an <input type="file"> element.
 * @param {string} context - Bucket path hint, e.g. "profiles", "pwd_front", "pwd_back".
 * @returns {Promise<string|null>} Public URL on success, null on failure / not configured.
 */
export async function uploadFile(file, context) {
  try {
    // 1. Get presigned PUT URL from backend
    const { data } = await api.post('/uploads/presign', {
      filename: file.name,
      context,
    })

    // 2. Upload directly to S3 — backend never touches the file bytes
    const s3Response = await fetch(data.upload_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    })

    if (!s3Response.ok) {
      console.error('[uploadService] S3 PUT failed:', s3Response.status, s3Response.statusText)
      return null
    }

    // 3. Return the permanent public URL for storage in DB
    return data.public_url

  } catch (err) {
    // 503 = backend not configured (env vars missing) — degrade gracefully
    if (err?.response?.status === 503) {
      console.warn('[uploadService] Storage not configured on this environment.')
    } else {
      console.error('[uploadService] Upload error:', err)
    }
    return null
  }
}
