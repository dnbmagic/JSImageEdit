import type { Uppy } from '@uppy/core'

/**
 * Async storage interface, similar to `localStorage`. This can be used to
 * implement custom storages for authentication tokens.
 */
export interface TokenStorage {
  setItem: (key: string, value: string) => Promise<void>
  getItem: (key: string) => Promise<string>
  removeItem: (key: string) => Promise<void>
}

type CompanionHeaders = Record<string, string>

type CompanionKeys = {
  key: string
  credentialsName: string
}

export interface RequestClientopts {
  companionUrl: string
  companionHeaders?: CompanionHeaders
  companionCookiesRule?: RequestCredentials
  companionKeysParams?: CompanionKeys
}

type Requestopts = {
  skipPostResponse?: boolean
  signal?: AbortSignal
}

export class RequestClient {
  constructor(uppy: Uppy, opts: RequestClientopts)

  readonly hostname: string

  setCompanionHeaders(headers: CompanionHeaders): void

  get<T = unknown>(path: string, opts?: Requestopts): Promise<T>

  /** @deprecated use option bag instead */
  get<T = unknown>(path: string, skipPostResponse: boolean): Promise<T>

  post<T = unknown>(
    path: string,
    data: Record<string, unknown>,
    opts?: Requestopts,
  ): Promise<T>

  /** @deprecated use option bag instead */
  post<T = unknown>(
    path: string,
    data: Record<string, unknown>,
    skipPostResponse: boolean,
  ): Promise<T>

  delete<T = unknown>(
    path: string,
    data?: Record<string, unknown>,
    opts?: Requestopts,
  ): Promise<T>

  /** @deprecated use option bag instead */
  delete<T = unknown>(
    path: string,
    data: Record<string, unknown>,
    skipPostResponse: boolean,
  ): Promise<T>
}

/**
 * opts for Providers that can be passed in by Uppy users through
 * Plugin constructors.
 */
export interface PublicProvideropts extends RequestClientopts {
  companionAllowedHosts?: string | RegExp | Array<string | RegExp>
}

/**
 * opts for Providers, including internal opts that Plugins can set.
 */
export interface Provideropts extends PublicProvideropts {
  provider: string
  name?: string
  pluginId: string
}

export class Provider extends RequestClient {
  constructor(uppy: Uppy, opts: Provideropts)

  checkAuth(): Promise<boolean>

  authUrl(): string

  fileUrl(id: string): string

  list(directory: string): Promise<any>

  logout(redirect?: string): Promise<any>

  static initPlugin(
    plugin: unknown,
    opts: Record<string, unknown>,
    defaultOpts?: Record<string, unknown>,
  ): void
}

export interface Socketopts {
  target: string
  autoOpen?: boolean
}

export class Socket {
  readonly isOpen: boolean

  constructor(opts: Socketopts)

  open(): void

  close(): void

  send(action: string, payload: unknown): void

  on(action: string, handler: (param: any) => void): void

  once(action: string, handler: (param: any) => void): void

  emit(action: string, payload: (param: any) => void): void
}
