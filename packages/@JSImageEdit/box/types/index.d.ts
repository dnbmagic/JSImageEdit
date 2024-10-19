import type { PluginTarget, UIPlugin, UIPluginopts } from '@JSImageEdit/core'
import type {
  PublicProvideropts,
  TokenStorage,
} from '@JSImageEdit/companion-client'

interface Boxopts extends UIPluginopts, PublicProvideropts {
  target?: PluginTarget
  title?: string
  storage?: TokenStorage
}

declare class Box extends UIPlugin<Boxopts> {}

export default Box
