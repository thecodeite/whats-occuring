const { createCanvas } = require('canvas')
const fetch = require('node-fetch')
const moment = require('moment')
const bodyParser = require('body-parser')

const { addRes } = require('../../shared/helpers')
const { inWorkHours } = require('../../shared/timesHelper')

const name = 'workTimer'
const timezone = 0

function niceTime(t) {
  return moment(t).add(-1, 'hour').format('h:mm a')
}

module.exports = {
  name,
  registerRoutes,
  makeOccurrence,
  shouldShow: inWorkHours,
}

function payload(hours, minutes = 0) {
  const m = moment().add(timezone, 'hour').startOf('day')
  const start = m.add(hours, 'hours').add(minutes, 'minutes').format()
  const end = m.add(8, 'hours').format()
  return {
    description: `Work timer: ${start}`,
    start,
    end,
  }
}

async function makeOccurrence(root) {
  const workTimerData = await readWorkTimer()

  const menus = [
    {
      title: 'Start at',
      dynamicSubMenu: `${root}/work-timer/start-menu`,
    },
    {
      title: 'Current Timer',
      dynamicSubMenu: `${root}/work-timer/menu-current`,
    },
  ]

  if (workTimerData.error) {
    return {
      name,
      icon: `${root}/work-timer/dynamic-icon.png?pct=0`,
      toolTip: workTimerData.error,
      menus,
    }
  }

  const pct = 100 - Math.floor(workTimerData.percent * 100)
  return {
    name,
    icon: `${root}/work-timer/dynamic-icon.png?pct=${pct}`,
    toolTip: workTimerData.leftDesc,
    menus,
  }
}

async function readWorkTimer() {
  const r = await fetch(
    'https://wt-477473e0fbb495e3cc5e2e34614d8d2e-0.run.webtask.io/currentTimedEvent'
  )
  const workTimerData = await r.json()
  // console.log('workTimerData:', workTimerData)
  return workTimerData
}

function registerRoutes(app) {
  app.get('/work-timer/dynamic-icon.png', (req, res) => {
    const { pct } = req.query
    console.log('pct:', pct)
    let pctAsNum = parseInt(pct)

    const canvas = createCanvas(100, 100)
    if (pctAsNum >= 0 && pctAsNum <= 100) {
      draw(canvas, pctAsNum)
    } else {
      draw(canvas)
    }

    res.setHeader('content-type', 'image/png')
    res.send(addRes(canvas.toBuffer('image/png')))
  })

  app.get('/work-timer/menu-current', async (req, res) => {
    try {
      const root = `${req.protocol}://${req.get('host')}`
      const workTimerData = await readWorkTimer()

      const menus = []
      if (workTimerData.percent > 0) {
        menus.push({
          title: 'Clear event',
          action: `${root}/work-timer/current-event`,
          method: 'DELETE',
        })
        menus.push({
          title: `Started at: ${niceTime(workTimerData.startTime)}`,
        })
        menus.push({
          title: `End at: ${niceTime(workTimerData.endTime)}`,
        })
        menus.push({
          title: 'Re-set start',
          dynamicSubMenu: `${root}/work-timer/start-menu?reset=true`,
        })
      } else {
        menus.push({
          title: 'Not started',
        })
      }

      res.json({ menus })
    } catch (e) {
      res.menus({
        title: e.toString(),
      })
    }
  })

  app.get('/work-timer/start-menu', (req, res) => {
    const root = `${req.protocol}://${req.get('host')}`
    const now = moment().add(timezone, 'hour') //BST
    const remainder = now.minute() % 5
    const nowIsh = moment(now).add(-remainder, 'minutes')
    res.json({
      menus: [
        {
          title: `Now (${now.format('HH:mm')})`,
          action: `${root}/work-timer/start`,
          method: 'POST',
          json: payload(now.hours(), now.minutes()),
        },
        {
          title: `Now ish(${nowIsh.format('HH:mm')})`,
          dynamicSubMenu: `${root}/work-timer/now-menu`,
          action: `${root}/work-timer/start`,
          method: 'POST',
          json: payload(nowIsh.hours(), nowIsh.minutes()),
        },
        {
          title: 'Common Times',
          staticSubMenu: `${root}/work-timer/common-times`,
        },
        {
          title: 'All Start times',
          staticSubMenu: `${root}/work-timer/all-times`,
        },
      ],
    })
  })

  app.get('/work-timer/now-menu', (req, res) => {
    const root = `${req.protocol}://${req.get('host')}`

    const now = moment().add(timezone, 'hour') //BST
    const remainder = now.minute() % 5
    now.add(-remainder, 'minutes')
    now.add(-5, 'minutes')

    const nowTimes = [...Array(6)].map((x) => ({
      title: now.format('HH:mm'),
      action: `${root}/work-timer/start`,
      method: 'POST',
      json: payload(now.hours(), now.minutes()),
      _: now.add(-5, 'minutes').format(''),
    }))

    res.json({
      menus: nowTimes,
    })
  })

  app.get('/work-timer/common-times', (req, res) => {
    const root = `${req.protocol}://${req.get('host')}`

    const common = moment()
      .add(1, 'hour') //BST
      .set('hour', 8)
      .set('minute', 0)
    const commonTimes = [...Array(9)].map((x) => ({
      title: common.format('HH:mm'),
      action: `${root}/work-timer/start`,
      method: 'POST',
      json: payload(common.hours(), common.minutes()),
      _: common.add(15, 'minutes').format(''),
    }))

    res.json({
      menus: commonTimes,
    })
  })

  const quarters = [
    { t: 'Night', q: 'night', s: 0 },
    { t: 'Morning', q: 'morning', s: 6 },
    { t: 'Afternoon', q: 'afternoon', s: 12 },
    { t: 'Evening', q: 'evening', s: 18 },
  ]
  app.get('/work-timer/all-times', (req, res) => {
    const root = `${req.protocol}://${req.get('host')}`
    res.json({
      menus: quarters.map(({ t, q }) => ({
        title: t,
        staticSubMenu: `${root}/work-timer/all-times/q/${q}`,
      })),
    })
  })

  app.get('/work-timer/all-times/q/:q', (req, res) => {
    const root = `${req.protocol}://${req.get('host')}`
    const { q } = req.params
    const s = (quarters.find((x) => x.q === q) || { s: 6 }).s
    res.json({
      menus: range(s, 6).map((h) => ({
        title: `${h}:00`,
        staticSubMenu: `${root}/work-timer/all-times/h/${h}`,
        action: `${root}/work-timer/start`,
        method: 'POST',
        json: payload(h),
      })),
    })
  })

  app.get('/work-timer/all-times/h/:h', (req, res) => {
    const root = `${req.protocol}://${req.get('host')}`
    const { h } = req.params
    res.json({
      menus: range(0, 60, 5).map((m) => ({
        title: `${h}:${('0' + m).slice(-2)}`,
        staticSubMenu: `${root}/work-timer/all-times/h/${h}/m/${m}`,
        action: `${root}/work-timer/start`,
        method: 'POST',
        json: payload(parseInt(h), m),
      })),
    })
  })

  app.get('/work-timer/all-times/h/:h/m/:m', (req, res) => {
    const root = `${req.protocol}://${req.get('host')}`
    const { h, m } = req.params
    res.json({
      menus: range(parseInt(m) + 1, 4).map((dm) => ({
        title: `${h}:${('0' + dm).slice(-2)}`,
        action: `${root}/work-timer/start`,
        method: 'POST',
        json: payload(parseInt(h), dm),
      })),
    })
  })

  app.delete('/work-timer/current-event', async (req, res) => {
    const r = await fetch(
      'https://wt-477473e0fbb495e3cc5e2e34614d8d2e-0.run.webtask.io/currentTimedEvent',
      {
        method: 'DELETE',
      }
    )
    const deleteWorkTimerData = await r.json()
    console.log('deleteWorkTimerData:', deleteWorkTimerData)
    res.json(deleteWorkTimerData)
  })

  app.post('/work-timer/start', bodyParser.json(), async (req, res) => {
    const formBody = Object.keys(req.body)
      .reduce((p, c) => {
        var encodedKey = encodeURIComponent(c)
        var encodedValue = encodeURIComponent(req.body[c])
        return [...p, encodedKey + '=' + encodedValue]
      }, [])
      .join('&')

    console.log('formBody:', formBody)

    const r = await fetch(
      'https://wt-477473e0fbb495e3cc5e2e34614d8d2e-0.run.webtask.io/currentTimedEvent',
      {
        method: 'POST',
        body: formBody,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      }
    )

    res.send()
  })
}

function range(s, c, step = 1) {
  return [...new Array(c / step)].map((_, i) => i * step + s)
}

function draw(canvas, pct) {
  const context = canvas.getContext('2d')

  const drawX = pct === undefined
  console.log('drawX:', drawX)
  if (!(pct >= 0 || pct <= 100)) pct = 0

  const start = Math.PI * 1.5
  const end = start + ((100 - pct) * Math.PI * 2) / 100

  const size = canvas.width

  const fillSegment = (segment) => {
    segment.save()
    segment.beginPath()
    segment.moveTo(size / 2, size / 2)
    segment.arc(size / 2, size / 2, size * 0.38, start, end, true)
    segment.closePath()
    segment.fill()
    segment.restore()
  }

  const fillTrack = (track) => {
    track.save()
    track.beginPath()
    track.moveTo(size / 2, size / 2)
    track.arc(size / 2, size / 2, size * 0.38, 0, 2 * Math.PI)
    track.closePath()
    track.fill()
    track.restore()
  }

  const clearCenter = (center) => {
    center.save()
    center.beginPath()
    center.arc(size / 2, size / 2, size * 0.2, 0, 2 * Math.PI)
    center.clip()
    // context.clearRect(0, 0, size, size)
    center.clearRect(size * 0.3, size * 0.3, size * 0.7, size * 0.7)
    center.closePath()
    center.restore()
  }

  const fillDot = (dot) => {
    dot.save()
    dot.beginPath()
    dot.moveTo(size / 2, size / 2)
    dot.arc(size / 2, size / 2, size * 0.03, 0, 2 * Math.PI)
    dot.closePath()
    dot.fill()
    dot.restore()
  }

  context.clearRect(0, 0, size, size)
  // context.fillStyle = "white";
  // context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(0, 0, 0, 0.2)'
  fillTrack(context)

  context.fillStyle = 'black'
  if (pct === 100) {
    fillTrack(context)
  } else {
    fillSegment(context)
  }

  clearCenter(context)

  context.fillStyle = 'black'
  fillDot(context)
}
