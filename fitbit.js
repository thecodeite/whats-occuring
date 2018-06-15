const {createCanvas} = require('canvas')
const fetch = require('node-fetch')

const {addRes} = require('./helpers')

const authorization = process.env['CODEITE_AUTH_HEADER']

module.exports = {
  registerRoutes,
  makeOccurance
}

const fitBitCache = {
  expires: null,
  data: null
}

async function makeOccurance (root) {
  const fitBitData = await readFitbitData()

  return {
    name: 'hourlySteps',
    icon: fitBitData.hourSteps > 250 ? `${root}/public/green-tick.png?v2` : `${root}/number/${250 - fitBitData.hourSteps}.png?color=${fitBitData.urgent?'red':'black'}`,
    toolTip: fitBitData.toolTip
  }
}

async function readFitbitData () {
  let fitBitData
  if (fitBitCache.data && fitBitCache.expires > (new Date()).getTime()) {
    console.log('using cache')
    fitBitData = fitBitCache.data
  } else {
    const r = await fetch('https://api-fitbit-com.auth.codeite.net/1/user/-/activities/steps/date/today/1d/15min.json', {
      headers: {
        authorization: `Bearer ${authorization}`
      }
    })

    fitBitCache.data = fitBitData = await r.json()
    fitBitCache.expires = (new Date()).getTime() + (1000 * 30);
  }

  if (!fitBitData['activities-steps-intraday'] || !fitBitData['activities-steps-intraday'].dataset) {
    return {}
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
    hourSteps,
    urgent: minute > 50
  }
}

function registerRoutes(app) {
  app.get('/number/:num.png', (req, res) => {
    const {num} = req.params
    const {color} = req.query
    const canvas = createCanvas(Math.floor(num.length * 30), 100)

    const context = canvas.getContext('2d')

    context.fillStyle = color || 'black'
    context.font = '45px sans-serif'
    context.fillText(num, 0, 45);

    res.setHeader('content-type', 'image/png')
    res.send(addRes(canvas.toBuffer('image/png')))
  })
}