const fs = require('fs-extra')

const {createCanvas} = require('canvas')
const fetch = require('node-fetch')

const {addRes} = require('./helpers')
const DataCache = require('./DataCache')
const authorization = process.env['CODEITE_AUTH_HEADER']

module.exports = {
  init,
  registerRoutes,
  makeOccurance
}

const cache = new DataCache('fitibt')
async function init() {
  return await cache.init()
}

async function makeOccurance (root) {
  const fitBitData = await readFitbitData()

  const icon = (() => {
    const hours = new Date().getHours()
    if (hours >= 9 && hours <= 17) {
      if (fitBitData.hourSteps < 0) return `${root}/fitbit/cross.png`
      if (fitBitData.hourSteps < 250) {
        return `${root}/fitbit-steps/${250 - fitBitData.hourSteps}.png?color=${fitBitData.urgent?'red':'black'}&hours=${fitBitData.hours}`
      }
    }

    return `${root}/fitbit-steps/tick.png?color=${fitBitData.urgent?'red':'black'}&hours=${fitBitData.hours}`
  })()

  return {
    name: 'hourlySteps',
    icon,
    colour: fitBitData.hourSteps < 250 && fitBitData.urgent,
    toolTip: fitBitData.toolTip,
  }
}

async function readFitbitData () {
  let fitBitData
  console.log('cache.now()  :', cache.now())
  console.log('cache.expires:', cache.expires)
  console.log('!!cache.data, cache.expired():', !!cache.data, cache.expired())
  if (cache.data && !cache.expired()) {
    console.log('fitbit using cache')
    fitBitData = cache.data
  } else {
    const r = await fetch('https://api-fitbit-com.auth.codeite.net/1/user/-/activities/steps/date/today/1d/15min.json', {
      headers: {
        authorization
      }
    })

    fitBitData = await r.json()
    // console.log(' fitBitData:',  fitBitData)
    if (!fitBitData.errors) {
      cache.set(fitBitData, 60)
    } else {
      let toolTip = ''
      if (Array.isArray(fitBitData.errors) && fitBitData.errors.find(x => x.message === 'Too Many Requests')) {
        toolTip = 'Rate limited';
        cache.set({error: toolTip}, 60)
      } else {
        toolTip = Array.isArray(fitBitData.errors) ? fitBitData.errors.map(x => x.message).join(', ') : `${fitBitData.errors}`
        cache.set({error: toolTip}, 0)
      }

      return {
        toolTip,
        hourSteps: -1,
        urgent: false
      }
    }
  }

  if (!fitBitData['activities-steps-intraday'] || !fitBitData['activities-steps-intraday'].dataset) {
    // console.error('fitBitData:', fitBitData)
    return {
      toolTip: 'activities-steps-intraday missing',
      hourSteps: -1,
      urgent: false
    }
  }

  const dataset = fitBitData['activities-steps-intraday'].dataset
  // console.log('dataset:', dataset)

  const agg = dataset.reduce((p, c) => {
    const h = parseInt(c.time.substr(0, 2), 10)
    if (h >= 9 && h <= 18) {
      if (p[h] === undefined) p[h] = 0
      p[h] += c.value
    }
    return p
  }, {})

  const hour = (new Date()).getHours()
  const minute = (new Date()).getMinutes()
  const hourSteps = agg[hour] || 0

  return {
    toolTip: Object.entries(agg).map(([h, v]) => `${v}`).join(','),
    hours: Object.entries(agg).map(([h, v]) => v >= 250 ? 'x':'.').join(''),
    hourSteps,
    urgent: minute > 50
  }
}

function registerRoutes(app) {
  app.get('/fitbit-steps/:num.png', (req, res) => {
    const {num} = req.params
    const {color, hours} = req.query
    const canvas = createCanvas(100, 100)
    const ctx = canvas.getContext('2d')

    ;(function (data) {
      ctx.fillStyle = data.color || 'black'
      ctx.strokeStyle = data.color || 'black'

      if (data.num === 'tick') {
        ctx.beginPath();
        let [x, y] = [20, 20]
        ctx.moveTo(x, y);
        [
          [10, 10],
          [20, -20],
          [10, 10],
          [-30, 30],
          [-20, -20]
        ].forEach(([dx,dy]) => {x+=dx; y+=dy; ctx.lineTo(x, y)});

        ctx.fill();
      } else {
        ctx.font = '45px sans-serif'
        ctx.fillText(data.num, 0, 45);
      }

      const s = 15
      const p = s + 2
      const l = 10

      ;[...new Array(4)].forEach((_, i) => {
        const x = p + i * p
        if(data.hours && data.hours[i] ==='x') ctx.fillRect(x-l, 54, s, s)
        if(data.hours && data.hours[i] ==='.') ctx.strokeRect(x-l+1, 55, s-2, s-2)
        if(data.hours && data.hours[i+4] === 'x') ctx.fillRect(x-l, 54+p, s, s)
        if(data.hours && data.hours[i+4] ==='.') ctx.strokeRect(x-l+1, 55+p, s-2, s-2)
      })
    })({num, hours, color})

    res.setHeader('content-type', 'image/png')
    res.send(addRes(canvas.toBuffer('image/png')))
  })

  app.get('/fitbit/tick.png', async (req, res) => {
    const buffer = await fs.readFile('./public/tick-100px.png')
    res.setHeader('content-type', 'image/png')
    res.send(addRes(buffer))
  })

  app.get('/fitbit/cross.png', async (req, res) => {
    const buffer = await fs.readFile('./public/cross-100px.png')
    res.setHeader('content-type', 'image/png')
    res.send(addRes(buffer))
  })
}