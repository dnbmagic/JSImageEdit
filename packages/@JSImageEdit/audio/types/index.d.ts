import type { PluginTarget, UIPlugin, UIPluginopts } from '@uppy/core'
import type AudioLocale from './generatedLocale'

export interface Audioopts extends UIPluginopts {
  target?: PluginTarget
  showAudioSourceDropdown?: boolean
  locale?: AudioLocale
}

declare class Audio extends UIPlugin<Audioopts> {}

export default Audio
