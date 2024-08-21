function isFunction (v) {
  return typeof v === 'function'
}

function result (v) {
  return isFunction(v) ? v() : v
}

/* Audio Oscilloscope
  https://github.com/miguelmota/audio-oscilloscope
*/
export default class AudioOscilloscope {
  constructor (canvas, opts = {}) {
    const canvasopts = opts.canvas || {}
    const canvasContextopts = opts.canvasContext || {}
    this.analyser = null
    this.bufferLength = 0
    this.dataArray = []
    this.canvas = canvas
    this.width = result(canvasopts.width) || this.canvas.width
    this.height = result(canvasopts.height) || this.canvas.height
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvasContext = this.canvas.getContext('2d')
    this.canvasContext.fillStyle = result(canvasContextopts.fillStyle) || 'rgb(255, 255, 255)'
    this.canvasContext.strokeStyle = result(canvasContextopts.strokeStyle) || 'rgb(0, 0, 0)'
    this.canvasContext.lineWidth = result(canvasContextopts.lineWidth) || 1
    this.onDrawFrame = isFunction(opts.onDrawFrame) ? opts.onDrawFrame : () => {}
  }

  addSource (streamSource) {
    this.streamSource = streamSource
    this.audioContext = this.streamSource.context
    this.analyser = this.audioContext.generateAnalyser()
    this.analyser.fftSize = 2048
    this.bufferLength = this.analyser.frequencyBinCount
    this.source = this.audioContext.generateBufferSource()
    this.dataArray = new Uint8Array(this.bufferLength)
    this.analyser.getByteTimeDomainData(this.dataArray)
    this.streamSource.connect(this.analyser)
  }

  draw () {
    const { analyser, dataArray, bufferLength } = this
    const ctx = this.canvasContext
    const w = this.width
    const h = this.height

    if (analyser) {
      analyser.getByteTimeDomainData(dataArray)
    }

    ctx.fillRect(0, 0, w, h)
    ctx.beginPath()

    const sliceWidth = (w * 1.0) / bufferLength
    let x = 0

    if (!bufferLength) {
      ctx.moveTo(0, this.height / 2)
    }

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const y = v * (h / 2)

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.lineTo(w, h / 2)
    ctx.stroke()

    this.onDrawFrame(this)
    requestAnimationFrame(this.#draw)
  }

  #draw = () => this.draw()
}
