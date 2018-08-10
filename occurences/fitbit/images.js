const { createCanvas } = require('canvas')
const { addRes } = require('../../shared/helpers')

module.exports = {
  fitBitImg: (req, res) => {
    const { num } = req.params
    const { color, hours } = req.query
    const canvas = createCanvas(100, 100)
    const ctx = canvas.getContext('2d')
    ;(function (data) {
      ctx.fillStyle = data.color || 'black'
      ctx.strokeStyle = data.color || 'black'

      if (data.num === 'tick') {
        ctx.beginPath()
        let [x, y] = [20, 20]
        ctx.moveTo(x, y)
        ;[
          [10, 10],
          [20, -20],
          [10, 10],
          [-30, 30],
          [-20, -20]
        ].forEach(([dx, dy]) => {
          x += dx
          y += dy
          ctx.lineTo(x, y)
        })

        ctx.fill()
      } else {
        ctx.font = '45px sans-serif'
        ctx.fillText(data.num, 0, 45)
      }

      const s = 14
      const p = s + 2
      const l = 6
      ;[...new Array(4)].forEach((_, i) => {
        const x = p + i * p
        if (data.hours && data.hours[i] === 'x') ctx.fillRect(x - l, 54, s, s)
        if (data.hours && data.hours[i] === '.') {
          ctx.strokeRect(x - l + 1, 55, s - 2, s - 2)
        }
      })
      ;[...new Array(5)].forEach((_, i) => {
        const x = p + i * p
        if (data.hours && data.hours[i + 4] === 'x') {
          ctx.fillRect(x - l - (s + 2) / 2, 54 + p, s, s)
        }
        if (data.hours && data.hours[i + 4] === '.') {
          ctx.strokeRect(x - l + 1 - (s + 2) / 2, 55 + p, s - 2, s - 2)
        }
      })
    })({ num, hours, color })

    res.setHeader('content-type', 'image/png')
    res.send(addRes(canvas.toBuffer('image/png')))
  }
}
