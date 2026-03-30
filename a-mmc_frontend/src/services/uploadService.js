// TODO(upload): Replace the uploadFile stub with Railway bucket
// integration when credentials are available.
// Expected return value: a public URL string for the uploaded file.
// context param is a string hint for bucket path organization.
// This is the ONLY file that needs to change when Railway is ready.

/**
 * Upload a file to the configured storage service.
 *
 * @param {File} file - The File object from an <input type="file"> element.
 * @param {string} context - Hint for bucket path organization (e.g. "pwd_front", "pwd_back").
 * @returns {Promise<string|null>} A public URL string on success, or null if unavailable.
 */
export async function uploadFile(file, context) {
  // Railway bucket integration pending — stub returns null to signal unavailability.
  console.warn(
    `[uploadService] Upload service not configured — Railway bucket pending. ` +
    `File: ${file?.name}, context: ${context}`
  )
  return null
}
