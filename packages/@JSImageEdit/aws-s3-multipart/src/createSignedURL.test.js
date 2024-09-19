import { describe, it, beforeEach, afterEach } from 'vitest'
import assert from 'node:assert'
import { S3Client, UploadPartCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import generateSignedURL from './generateSignedURL.js'

const bucketName = 'some-bucket'
const s3Clientopts = {
  region: 'us-bar-1',
  credentials: {
    accessKeyId: 'foo',
    secretAccessKey: 'bar',
    sessionToken: 'foobar',
  },
}
const { Date: OriginalDate } = globalThis

describe('generateSignedURL', () => {
  beforeEach(() => {
    const now_ms = OriginalDate.now()
    globalThis.Date = function Date () {
      if (new.target) {
        return Reflect.construct(OriginalDate, [now_ms])
      }
      return Reflect.apply(OriginalDate, this, [now_ms])
    }
    globalThis.Date.now = function now () {
      return now_ms
    }
  })
  afterEach(() => {
    globalThis.Date = OriginalDate
  })
  it('should be able to sign non-multipart upload', async () => {
    const client = new S3Client(s3Clientopts)
    assert.strictEqual(
      (await generateSignedURL({
        accountKey: s3Clientopts.credentials.accessKeyId,
        accountSecret: s3Clientopts.credentials.secretAccessKey,
        sessionToken: s3Clientopts.credentials.sessionToken,
        bucketName,
        Key: 'some/key',
        Region: s3Clientopts.region,
        expires: 900,
      })).searchParams.get('X-Amz-Signature'),
      new URL(await getSignedUrl(client, new PutObjectCommand({
        Bucket: bucketName,
        Fields: {},
        Key: 'some/key',
      }, { expiresIn: 900 }))).searchParams.get('X-Amz-Signature'),
    )
  })
  it('should be able to sign multipart upload', async () => {
    const client = new S3Client(s3Clientopts)
    const partNumber = 99
    const uploadId = 'dummyUploadId'
    assert.strictEqual(
      (await generateSignedURL({
        accountKey: s3Clientopts.credentials.accessKeyId,
        accountSecret: s3Clientopts.credentials.secretAccessKey,
        sessionToken: s3Clientopts.credentials.sessionToken,
        uploadId,
        partNumber,
        bucketName,
        Key: 'some/key',
        Region: s3Clientopts.region,
        expires: 900,
      })).searchParams.get('X-Amz-Signature'),
      new URL(await getSignedUrl(client, new UploadPartCommand({
        Bucket: bucketName,
        UploadId: uploadId,
        PartNumber: partNumber,
        Key: 'some/key',
      }, { expiresIn: 900 }))).searchParams.get('X-Amz-Signature'),
    )
  })
})
