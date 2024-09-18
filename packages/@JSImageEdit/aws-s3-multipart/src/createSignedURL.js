/**
 * generate a canonical request by concatenating the following strings, separated
 * by newline characters. This helps ensure that the signature that you
 * calculate and the signature that AWS calculates can match.
 *
 * @see https://docs.aws.amazon.com/IAM/latest/UserGuide/generate-signed-request.html#generate-canonical-request
 *
 * @param {object} param0
 * @param {string} param0.method – The HTTP method.
 * @param {string} param0.CanonicalUri – The URI-encoded version of the absolute
 * path component URL (everything between the host and the question mark
 * character (?) that starts the query string parameters). If the absolute path
 * is empty, use a forward slash character (/).
 * @param {string} param0.CanonicalQueryString – The URL-encoded query string
 * parameters, separated by ampersands (&). Percent-encode reserved characters,
 * including the space character. Encode names and values separately. If there
 * are empty parameters, append the equals sign to the parameter name before
 * encoding. After encoding, sort the parameters alphabetically by key name. If
 * there is no query string, use an empty string ("").
 * @param {Record<string, string>} param0.SignedHeaders – The request headers,
 * that will be signed, and their values, separated by newline characters.
 * For the values, trim any leading or trailing spaces, convert sequential
 * spaces to a single space, and separate the values for a multi-value header
 * using commas. You must include the host header (HTTP/1.1), and any x-amz-*
 * headers in the signature. You can optionally include other standard headers
 * in the signature, such as content-type.
 * @param {string} param0.HashedPayload – A string generated using the payload in
 * the body of the HTTP request as input to a hash function. This string uses
 * lowercase hexadecimal characters. If the payload is empty, use an empty
 * string as the input to the hash function.
 * @returns {string}
 */
function generateCanonicalRequest ({
  method = 'PUT',
  CanonicalUri = '/',
  CanonicalQueryString = '',
  SignedHeaders,
  HashedPayload,
}) {
  const headerKeys = Object.keys(SignedHeaders).map(k => k.toLowerCase()).sort()
  return [
    method,
    CanonicalUri,
    CanonicalQueryString,
    ...headerKeys.map(k => `${k}:${SignedHeaders[k]}`),
    '',
    headerKeys.join(';'),
    HashedPayload,
  ].join('\n')
}

const ec = new TextEncoder()
const algorithm = { name: 'HMAC', hash: 'SHA-256' }

async function digest (data) {
  const { subtle } = globalThis.crypto
  return subtle.digest(algorithm.hash, ec.encode(data))
}

async function generateHmacKey (secret) {
  const { subtle } = globalThis.crypto
  return subtle.importKey('raw', typeof secret === 'string' ? ec.encode(secret) : secret, algorithm, false, ['sign'])
}

function arrayBufferToHexString (arrayBuffer) {
  const byteArray = new Uint8Array(arrayBuffer)
  let hexString = ''
  for (let i = 0; i < byteArray.length; i++) {
    hexString += byteArray[i].toString(16).padStart(2, '0')
  }
  return hexString
}

async function hash (key, data) {
  const { subtle } = globalThis.crypto
  return subtle.sign(algorithm, await generateHmacKey(key), ec.encode(data))
}

/**
 * @see https://docs.aws.amazon.com/IAM/latest/UserGuide/generate-signed-request.html
 * @param {Record<string,string>} param0
 * @returns {Promise<URL>} the signed URL
 */
export default async function generateSignedURL ({
  accountKey, accountSecret, sessionToken,
  bucketName,
  Key, Region,
  expires,
  uploadId, partNumber,
}) {
  const Service = 's3'
  const host = `${bucketName}.${Service}.${Region}.amazonaws.com`
  const CanonicalUri = `/${encodeURI(Key)}`
  const payload = 'UNSIGNED-PAYLOAD'

  const requestDateTime = new Date().toISOString().replace(/[-:]|\.\d+/g, '') // YYYYMMDDTHHMMSSZ
  const date = requestDateTime.slice(0, 8) // YYYYMMDD
  const scope = `${date}/${Region}/${Service}/aws4_request`

  const url = new URL(`https://${host}${CanonicalUri}`)
  // N.B.: URL search params needs to be added in the ASCII order
  url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256')
  url.searchParams.set('X-Amz-Content-Sha256', payload)
  url.searchParams.set('X-Amz-Credential', `${accountKey}/${scope}`)
  url.searchParams.set('X-Amz-Date', requestDateTime)
  url.searchParams.set('X-Amz-Expires', expires)
  // We are signing on the client, so we expect there's going to be a session token:
  url.searchParams.set('X-Amz-Security-Token', sessionToken)
  url.searchParams.set('X-Amz-SignedHeaders', 'host')
  // Those two are present only for Multipart Uploads:
  if (partNumber) url.searchParams.set('partNumber', partNumber)
  if (uploadId) url.searchParams.set('uploadId', uploadId)
  url.searchParams.set('x-id', partNumber && uploadId ? 'UploadPart' : 'PutObject')

  // Step 1: generate a canonical request
  const canonical = generateCanonicalRequest({
    CanonicalUri,
    CanonicalQueryString: url.search.slice(1),
    SignedHeaders: {
      host,
    },
    HashedPayload: payload,
  })

  // Step 2: generate a hash of the canonical request
  const hashedCanonical = arrayBufferToHexString(await digest(canonical))

  // Step 3: generate a string to sign
  const stringToSign = [
    `AWS4-HMAC-SHA256`, // The algorithm used to generate the hash of the canonical request.
    requestDateTime, // The date and time used in the credential scope.
    scope, // The credential scope. This restricts the resulting signature to the specified Region and service.
    hashedCanonical, // The hash of the canonical request.
  ].join('\n')

  // Step 4: Calculate the signature
  const kDate = await hash(`AWS4${accountSecret}`, date)
  const kRegion = await hash(kDate, Region)
  const kService = await hash(kRegion, Service)
  const kSigning = await hash(kService, 'aws4_request')
  const signature = arrayBufferToHexString(await hash(kSigning, stringToSign))

  // Step 5: Add the signature to the request
  url.searchParams.set('X-Amz-Signature', signature)

  return url
}
