const path = require('path')
const { createCanvas, loadImage } = require('canvas')
const { addRes } = require('../../shared/helpers')

const appDir = path.dirname(require.main.filename)

module.exports = {
  getIcon: status => async (req, res) => {
    const { text } = req.params
    console.log('text:', text)
    const canvas = createCanvas(100, 100)
    const ctx = canvas.getContext('2d')
    // ctx.fillStyle = 'white'
    // ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalAlpha = status !== 'good' ? 1 : 0.5
    const image = await loadImage(`${appDir}/public/construction-sign.png`)
    ctx.drawImage(image, 10, 10, 80, 80)

    ctx.globalAlpha = 1
    if (status === 'good') {
      const image = await loadImage(`${appDir}/public/tick-100px.png`)
      ctx.drawImage(image, 10, 10, 80, 80)
    } else if (status === 'bad') {
      const image = await loadImage(`${appDir}/public/cross-100px.png`)
      ctx.drawImage(image, 10, 10, 80, 80)
    }

    res.setHeader('content-type', 'image/png')
    res.send(addRes(canvas.toBuffer('image/png')))
  },
  getIcon2: status => async (req, res) => {
    const { text } = req.params
    console.log('text:', text)
    const canvas = createCanvas(100, 100)
    const ctx = canvas.getContext('2d')
    // ctx.fillStyle = 'white'
    // ctx.fillRect(0, 0, canvas.width, canvas.height)

    const image = await loadImage(`${appDir}/public/small-screen.png`)
    ctx.drawImage(image, 10, 10, 80, 80)

    res.setHeader('content-type', 'image/png')
    res.send(addRes(canvas.toBuffer('image/png')))
  }
}
