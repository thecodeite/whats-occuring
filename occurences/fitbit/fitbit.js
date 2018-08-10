const fetch = require('node-fetch')

const { fitBitImg } = require('../fitbit/images')
const DataCache = require('../../shared/DataCache')
const authorization = process.env['CODEITE_AUTH_HEADER']

const name = 'hourlySteps'

module.exports = {
  name,
  init,
  registerRoutes,
  makeOccurance
}

const cache = new DataCache('fitibit')
async function init () {
  return await cache.init()
}

async function makeOccurance (root, clearCache) {
  const fitBitData = await readFitbitData(clearCache)

  const icon = (() => {
    const hours = new Date().getHours()
    if (fitBitData.hourSteps < 0) return `${root}/fitbit/cross.png`

    if (hours >= 9 && hours <= 17) {
      if (fitBitData.hourSteps < 250) {
        return `${root}/fitbit-steps/${250 - fitBitData.hourSteps}.png?color=${fitBitData.urgent ? 'red' : 'black'}&hours=${fitBitData.hours}`
      }
    }

    return `${root}/fitbit-steps/tick.png?color=rgba(128,128,128,.25)&hours=${fitBitData.hours}`
  })()

  return {
    name,
    icon,
    colour: fitBitData.hourSteps < 250 && fitBitData.urgent,
    toolTip: fitBitData.toolTip,
    usesCache: true
  }
}

async function readFitbitData (clearCache) {
  let fitBitData
  if (!clearCache && cache.data && !cache.expired()) {
    // console.log('fitbit using cache')
    fitBitData = cache.data
  } else {
    const r = await fetch(
      'https://api-fitbit-com.auth.codeite.net/1/user/-/activities/steps/date/today/1d/15min.json',
      {
        headers: {
          authorization
        }
      }
    )

    fitBitData = await r.json()
    // console.log(' fitBitData:',  fitBitData)
    if (!fitBitData.errors) {
      cache.set(fitBitData, 60)
    } else {
      let toolTip = ''
      if (
        Array.isArray(fitBitData.errors) &&
        fitBitData.errors.find(x => x.message === 'Too Many Requests')
      ) {
        toolTip = 'Rate limited'
        cache.set({ error: toolTip }, 60)
      } else {
        toolTip = Array.isArray(fitBitData.errors)
          ? fitBitData.errors.map(x => x.message).join(', ')
          : `${fitBitData.errors}`
        cache.set({ error: toolTip }, 0)
      }

      return {
        toolTip,
        hourSteps: -1,
        urgent: false
      }
    }
  }

  if (
    !fitBitData['activities-steps-intraday'] ||
    !fitBitData['activities-steps-intraday'].dataset
  ) {
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

  const hour = new Date().getHours()
  const minute = new Date().getMinutes()
  const hourSteps = agg[hour] || 0

  return {
    toolTip: Object.entries(agg).map(([h, v]) => `${v}`).join(','),
    hours: Object.entries(agg).map(([h, v]) => (v >= 250 ? 'x' : '.')).join(''),
    hourSteps,
    urgent: hour >= 9 && hour <= 17 && minute > 50
  }
}

function registerRoutes (app) {
  app.get('/fitbit-steps/:num.png', fitBitImg)

  // app.get('/fitbit/tick.png', async (req, res) => {
  //   const buffer = await fs.readFile('./public/tick-100px.png')
  //   res.setHeader('content-type', 'image/png')
  //   res.send(addRes(buffer))
  // })

  // app.get('/fitbit/cross.png', async (req, res) => {
  //   const buffer = await fs.readFile('./public/cross-100px.png')
  //   res.setHeader('content-type', 'image/png')
  //   res.send(addRes(buffer))
  // })
}
