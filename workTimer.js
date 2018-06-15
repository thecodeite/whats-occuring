const {createCanvas} = require('canvas')
const fetch = require('node-fetch')

const {addRes} = require('./helpers')

module.exports = {
  registerRoutes,
  makeOccurance
}

async function makeOccurance (root) {
  const workTimerData = await readWorkTimer()

  return {
    name: 'workTimer',
    icon: `${root}/work-timer/dynamic-icon.png?pct=${100 - Math.floor(workTimerData.percent * 100)}`,
    toolTip: workTimerData.leftDesc
  }
}

async function readWorkTimer () {
  const r = await fetch('https://wt-477473e0fbb495e3cc5e2e34614d8d2e-0.run.webtask.io/currentTimedEvent')
  const workTimerData = await r.json()

  return workTimerData
}

function registerRoutes(app) {
  app.get('/work-timer/dynamic-icon.png',  (req, res) => {
    const {pct} = req.query
    const pctAsNum = (pct && parseInt(pct)) || 50

    const canvas = createCanvas(100, 100)
    draw(canvas, pctAsNum)

    res.setHeader('content-type', 'image/png')
    res.send(addRes(canvas.toBuffer('image/png')))
  })
}

function draw(canvas, pct) {
  const context = canvas.getContext('2d')

  const start = Math.PI * 1.5
  const end = start + ((100-pct) * Math.PI * 2)/100

  const size = canvas.width

  const fillSegment = segment => {
    segment.save()
    segment.beginPath()
    segment.moveTo(size/2, size/2);
    segment.arc(size/2, size/2, size*.38, start, end, true)
    segment.closePath()
    segment.fill()
    segment.restore()
  }

  const fillTrack = track => {
    track.save()
    track.beginPath()
    track.moveTo(size/2, size/2);
    track.arc(size/2, size/2, size*.38, 0, 2 * Math.PI);
    track.closePath()
    track.fill()
    track.restore()
  }

  const clearCenter = center => {
    center.save()
    center.beginPath();
    center.arc(size/2, size/2, size*.2, 0, 2 * Math.PI);
    center.clip();
    //context.clearRect(0, 0, size, size)
    center.clearRect(size*.3, size*.3, size*.7, size*.7);
    center.closePath();
    center.restore()
  }

  const fillDot = dot => {
    dot.save()
    dot.beginPath()
    dot.moveTo(size/2, size/2);
    dot.arc(size/2, size/2, size*.03, 0, 2 * Math.PI);
    dot.closePath()
    dot.fill()
    dot.restore()
  }

  context.clearRect(0, 0, size, size)
  //context.fillStyle = "white";
  //context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(0, 0, 0, 0.2)';
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