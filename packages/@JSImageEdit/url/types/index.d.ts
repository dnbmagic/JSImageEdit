import type { RequestClientopts } from '@JSImageEdit/companion-client'
import type {
  IndexedObject,
  PluginTarget,
  UIPlugin,
  UIPluginopts,
} from '@JSImageEdit/core'
import UrlLocale from './generatedLocale'

export interface Urlopts extends UIPluginopts, RequestClientopts {
  target?: PluginTarget
  title?: string
  locale?: UrlLocale
}

declare class Url extends UIPlugin<Urlopts> {
  public addFile(
    url: string,
    meta?: IndexedObject<any>,
  ): undefined | string | never
}

export default Url
