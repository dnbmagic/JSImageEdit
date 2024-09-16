import { AbortController } from '@uppy/utils/lib/AbortController'

const MB = 1024 * 1024

const defaultopts = {
  getChunkSize (file) {
    return Math.ceil(file.size / 10000)
  },
  onProgress () {},
  onPartComplete () {},
  onSuccess () {},
  onError (err) {
    throw err
  },
}

function ensureInt (value) {
  if (typeof value === 'string') {
    return parseInt(value, 10)
  }
  if (typeof value === 'number') {
    return value
  }
  throw new TypeError('Expected a number')
}

export const pausingUploadReason = Symbol('pausing upload, not an actual error')

/**
 * A MultipartUploader instance is used per file upload to determine whether a
 * upload should be done as multipart or as a regular S3 upload
 * (based on the user-provided `shouldUseMultipart` option value) and to manage
 * the chunk splitting.
 */
class MultipartUploader {
  #abortController = new AbortController()

  /** @type {import("../types/chunk").Chunk[]} */
  #chunks

  /** @type {{ uploaded: number, etag?: string, done?: boolean }[]} */
  #chunkState

  /**
   * The (un-chunked) data to upload.
   *
   * @type {Blob}
   */
  #data

  /** @type {import("@uppy/core").UppyFile} */
  #file

  /** @type {boolean} */
  #uploadHasStarted = false

  /** @type {(err?: Error | any) => void} */
  #onError

  /** @type {() => void} */
  #onSuccess

  /** @type {import('../types/index').AwsS3Multipartopts["shouldUseMultipart"]} */
  #shouldUseMultipart

  /** @type {boolean} */
  #isRestoring

  #onReject = (err) => (err?.cause === pausingUploadReason ? null : this.#onError(err))

  #maxMultipartParts = 10_000

  #minPartSize = 5 * MB

  constructor (data, opts) {
    this.opts = {
      ...defaultopts,
      ...opts,
    }
    // Use default `getChunkSize` if it was null or something
    this.opts.getChunkSize ??= defaultopts.getChunkSize

    this.#data = data
    this.#file = opts.file
    this.#onSuccess = this.opts.onSuccess
    this.#onError = this.opts.onError
    this.#shouldUseMultipart = this.opts.shouldUseMultipart

    // When we are restoring an upload, we already have an UploadId and a Key. Otherwise
    // we need to call `generateMultipartUpload` to get an `uploadId` and a `key`.
    // Non-multipart uploads are not restorable.
    this.#isRestoring = opts.uploadId && opts.key

    this.#initChunks()
  }

  // initChunks checks the user preference for using multipart uploads (opts.shouldUseMultipart)
  // and calculates the optimal part size. When using multipart part uploads every part except for the last has
  // to be at least 5 MB and there can be no more than 10K parts.
  // This means we sometimes need to change the preferred part size from the user in order to meet these requirements.
  #initChunks () {
    const fileSize = this.#data.size
    const shouldUseMultipart = typeof this.#shouldUseMultipart === 'function'
      ? this.#shouldUseMultipart(this.#file)
      : Boolean(this.#shouldUseMultipart)

    if (shouldUseMultipart && fileSize > this.#minPartSize) {
      // At least 5MB per request:
      let chunkSize = Math.max(this.opts.getChunkSize(this.#data), this.#minPartSize)
      let arraySize = Math.floor(fileSize / chunkSize)

      // At most 10k requests per file:
      if (arraySize > this.#maxMultipartParts) {
        arraySize = this.#maxMultipartParts
        chunkSize = fileSize / this.#maxMultipartParts
      }
      this.#chunks = Array(arraySize)

      for (let offset = 0, j = 0; offset < fileSize; offset += chunkSize, j++) {
        const end = Math.min(fileSize, offset + chunkSize)

        // Defer data fetching/slicing until we actually need the data, because it's slow if we have a lot of files
        const getData = () => {
          const i2 = offset
          return this.#data.slice(i2, end)
        }

        this.#chunks[j] = {
          getData,
          onProgress: this.#onPartProgress(j),
          onComplete: this.#onPartComplete(j),
          shouldUseMultipart,
        }
        if (this.#isRestoring) {
          const size = offset + chunkSize > fileSize ? fileSize - offset : chunkSize
          // setAsUploaded is called by listPart, to keep up-to-date the
          // quantity of data that is left to actually upload.
          this.#chunks[j].setAsUploaded = () => {
            this.#chunks[j] = null
            this.#chunkState[j].uploaded = size
          }
        }
      }
    } else {
      this.#chunks = [{
        getData: () => this.#data,
        onProgress: this.#onPartProgress(0),
        onComplete: this.#onPartComplete(0),
        shouldUseMultipart,
      }]
    }

    this.#chunkState = this.#chunks.map(() => ({ uploaded: 0 }))
  }

  #generateUpload () {
    this
      .opts.companionComm.uploadFile(this.#file, this.#chunks, this.#abortController.signal)
      .then(this.#onSuccess, this.#onReject)
    this.#uploadHasStarted = true
  }

  #resumeUpload () {
    this
      .opts.companionComm.resumeUploadFile(this.#file, this.#chunks, this.#abortController.signal)
      .then(this.#onSuccess, this.#onReject)
  }

  #onPartProgress = (index) => (ev) => {
    if (!ev.lengthComputable) return

    this.#chunkState[index].uploaded = ensureInt(ev.loaded)

    const totalUploaded = this.#chunkState.reduce((n, c) => n + c.uploaded, 0)
    this.opts.onProgress(totalUploaded, this.#data.size)
  }

  #onPartComplete = (index) => (etag) => {
    // This avoids the net::ERR_OUT_OF_MEMORY in Chromium Browsers.
    this.#chunks[index] = null
    this.#chunkState[index].etag = etag
    this.#chunkState[index].done = true

    const part = {
      PartNumber: index + 1,
      ETag: etag,
    }
    this.opts.onPartComplete(part)
  }

  #abortUpload () {
    this.#abortController.abort()
    this.opts.companionComm.abortFileUpload(this.#file).catch((err) => this.opts.log(err))
  }

  start () {
    if (this.#uploadHasStarted) {
      if (!this.#abortController.signal.aborted) this.#abortController.abort(pausingUploadReason)
      this.#abortController = new AbortController()
      this.#resumeUpload()
    } else if (this.#isRestoring) {
      this.opts.companionComm.restoreUploadFile(this.#file, { uploadId: this.opts.uploadId, key: this.opts.key })
      this.#resumeUpload()
    } else {
      this.#generateUpload()
    }
  }

  pause () {
    this.#abortController.abort(pausingUploadReason)
    // Swap it out for a new controller, because this instance may be resumed later.
    this.#abortController = new AbortController()
  }

  abort (opts = undefined) {
    if (opts?.really) this.#abortUpload()
    else this.pause()
  }

  // TODO: remove this in the next major
  get chunkState () {
    return this.#chunkState
  }
}

export default MultipartUploader
