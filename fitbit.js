const fs = require('fs-extra')

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

  const icon = fitBitData.hourSteps > 250 ? `${root}/fitbit/tick.png` :
    fitBitData.hourSteps < 0 ? `${root}/fitbit/tick.png` :
    `${root}/number/${250 - fitBitData.hourSteps}.png?color=${fitBitData.urgent?'red':'black'}`

  return {
    name: 'hourlySteps',
    icon,
    toolTip: fitBitData.toolTip
  }
}

async function readFitbitData () {
  let fitBitData
  //fitBitCache.expires = (new Date()).getTime()-100
  //fitBitCache.data = {error: 'dev'}
  if (fitBitCache.data && fitBitCache.expires > (new Date()).getTime()) {
    console.log('using cache')
    fitBitData = fitBitCache.data
  } else {
    const r = await fetch('https://api-fitbit-com.auth.codeite.net/1/user/-/activities/steps/date/today/1d/15min.json', {
      headers: {
        authorization
      }
    })

    fitBitData = await r.json()
    console.log(' fitBitData:',  fitBitData)
    if (!fitBitData.errors) {
      fitBitCache.data = fitBitData;
      fitBitCache.expires = (new Date()).getTime() + (1000 * 30);
    } else {
      let toolTip = ''
      if (Array.isArray(fitBitData.errors) && fitBitData.errors.find(x => x.message === 'Too Many Requests')) {
        toolTip = 'Rate limited';
        fitBitCache.data = {error: toolTip}
        fitBitCache.expires = (new Date()).getTime() + (1000 * 60);
      } else {
        toolTip = Array.isArray(fitBitData.errors) ? fitBitData.errors.map(x => x.message).join(', ') : `${fitBitData.errors}`
        fitBitCache.data = {error: toolTip}
        fitBitCache.expires = 0
      }

      return {
        toolTip,
        hourSteps: -1,
        urgent: true
      }
    }
  }

  if (!fitBitData['activities-steps-intraday'] || !fitBitData['activities-steps-intraday'].dataset) {
    console.error('fitBitData:', fitBitData)
    return {
      toolTip: 'activities-steps-intraday missing',
      hourSteps: -1,
      urgent: true
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