const fs = require('fs-extra')

const {createCanvas} = require('canvas')
const fetch = require('node-fetch')
const moment = require('moment')

const upcomingResponsibilities = require('@codeite/upcoming-responsibilities')

const {addRes} = require('./helpers')
const DataCache = require('./DataCache')

const listsCookie = process.env['LISTS_COOKIE'];
const tasksApi = 'https://lists.codeite.net/list/~/resps/'

module.exports = {
  registerRoutes,
  makeOccurance,
  init
}

const cache = new DataCache('tasks')
async function init() {
  return await cache.init()
}

async function makeOccurance (root) {
  const {taskData, upcoming} = await readTaskData()

  const overdueCount = upcoming.filter(x => x.overdue).length
  const toolTip =  `Overdue: ${overdueCount} `

  const icon = overdueCount > 0 ?
    `${root}/warning/${overdueCount}.png` :
    `${root}/fitbit/tick.png`

  return {
    name: 'tasks',
    icon,
    colour: true,
    toolTip,
    menus: [
      {
        title: 'Next 10',
        dynamicSubMenu: `${root}/tasks/top-ten-menu`
      }
    ]
  }
}

async function readTaskData () {
  let taskData
  if (cache.data && !cache.expired()) {
    // console.log('tasks using cache')
    taskData = cache.data
  } else {
    const r = await fetch(tasksApi, {
      headers: {
        'Cookie': `lists=${listsCookie}`
      }
    })

    taskData = await r.json()
    cache.set(taskData, 0)
  }

  const responsibilities = Object.values(taskData)
  const upcoming = upcomingResponsibilities.getResponsibilitiesAfterNow(responsibilities, 10)
  // console.log('upcoming:', upcoming)

  return {
    taskData,
    upcoming
  }

  // // console.log('taskData:', taskData)

  // return {
  //   toolTip,
  //   menus: upcoming.map(x => ({
  //     title: `${x.name} ${moment(x.date).format('YYYY-MM-DD')}`,
  //     // GET https://lists.codeite.net/list/~/resps/_/60c48fa0-f89c-11e6-9078-edfe494efaa6
  //     // PATCH https://lists.codeite.net/list/~/resps/_/60c48fa0-f89c-11e6-9078-edfe494efaa6 {"id":"60c48fa0-f89c-11e6-9078-edfe494efaa6","complete":"0_19"}
  //   }))
  // }
}

function registerRoutes(app) {
  app.get('/tasks/top-ten-menu', async (req, res) => {
    const {upcoming} = await readTaskData()

    res.json({
      title: 'Top Ten',
      menus: upcoming.map(x => ({
        title: `${x.name} ${moment(x.date).format('YYYY-MM-DD')}`,
        menus: [
          {title: 'Mark as done'},
        ]
        // GET https://lists.codeite.net/list/~/resps/_/60c48fa0-f89c-11e6-9078-edfe494efaa6
        // PATCH https://lists.codeite.net/list/~/resps/_/60c48fa0-f89c-11e6-9078-edfe494efaa6 {"id":"60c48fa0-f89c-11e6-9078-edfe494efaa6","complete":"0_19"}
      }))
    })
  })
  app.get('/warning/:number.png', (req, res) => {
    const data = {
      number: parseInt(req.params.number|| 0)
    }
    const {color} = req.query

    const canvas = createCanvas(100, 100)
    const ctx = canvas.getContext('2d')

    ctx.beginPath();
    ctx.arc(50, 50, 38, 0, 2 * Math.PI, false);
    ctx.fillStyle = color || '#B40A28';
    ctx.fill();

    const baseFontSize = 75
    const fontSize = data.number === 0 ? `${baseFontSize}px` : `${baseFontSize - (20 * Math.floor(Math.log10(data.number)))}px`;
    ctx.beginPath();
    ctx.fillStyle = 'white';
    ctx.font = `${fontSize} sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle'
    ctx.fillText(data.number, 50, 55, 100)

    res.setHeader('content-type', 'image/png')
    res.send(addRes(canvas.toBuffer('image/png')))
  })

  // app.get('/number/:num.png', (req, res) => {
  //   const {num} = req.params
  //   const {color} = req.query
  //   const canvas = createCanvas(Math.floor(num.length * 30), 100)

  //   const context = canvas.getContext('2d')

  //   context.fillStyle = color || 'black'
  //   context.font = '45px sans-serif'
  //   context.fillText(num, 0, 45);

  //   res.setHeader('content-type', 'image/png')
  //   res.send(addRes(canvas.toBuffer('image/png')))
  // })

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