import { AwsS3Multipartopts } from '@uppy/aws-s3-multipart'
import type { BasePlugin, Locale, Pluginopts, UppyFile } from '@uppy/core'

type MaybePromise<T> = T | Promise<T>

export type AwsS3UploadParameters =
  | {
      method?: 'POST'
      url: string
      fields?: Record<string, string>
      expires?: number
      headers?: Record<string, string>
    }
  | {
      method: 'PUT'
      url: string
      fields?: Record<string, never>
      expires?: number
      headers?: Record<string, string>
    }

interface LegacyAwsS3opts extends Pluginopts {
  shouldUseMultipart?: never
  companionUrl?: string | null
  companionHeaders?: Record<string, string>
  allowedMetaFields?: Array<string> | null
  getUploadParameters?: (file: UppyFile) => MaybePromise<AwsS3UploadParameters>
  limit?: number
  /** @deprecated this option will not be supported in future versions of this plugin */
  getResponseData?: (responseText: string, response: XMLHttpRequest) => void
  locale?: Locale
  timeout?: number
}

export type AwsS3opts = LegacyAwsS3opts | AwsS3Multipartopts

declare class AwsS3 extends BasePlugin<AwsS3opts> {}

export default AwsS3
