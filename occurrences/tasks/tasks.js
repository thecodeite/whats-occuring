const { createCanvas, registerFont } = require('canvas')
const fetch = require('node-fetch')
const moment = require('moment')
const bodyParser = require('body-parser')

const upcomingResponsibilities = require('@codeite/upcoming-responsibilities')

const { addRes } = require('../../shared/helpers')
const DataCache = require('../../shared/DataCache')

const listsCookie = process.env['LISTS_COOKIE']
const tasksApi = 'https://lists.codeite.net/list/~/resps/'
const taskApi = taskId => `https://lists.codeite.net/list/~/resps/_/${taskId}`

const name = 'tasks'

module.exports = {
  name,
  registerRoutes,
  makeOccurrence,
  init
}

const cache = new DataCache('tasks', __dirname)
async function init() {
  return await cache.init()
}

async function makeOccurrence(root) {
  let upcoming = null
  try {
    const res = await readTaskData()
    upcoming = res.upcoming
  } catch (e) {
    console.log('e:', e)
    return {
      name,
      icon: `${root}/common/cross.png`,
      colour: true,
      toolTip: 'Error reading tasks:' + e,
      menu: []
    }
  }

  const overdueCount = upcoming.filter(x => x.overdue).length
  const dueCount = upcoming.filter(x => x.isDue).length
  const toolTip = `Overdue: ${overdueCount} Due ${dueCount}`

  const icon =
    overdueCount > 0
      ? `${root}/error/${overdueCount}.png`
      : dueCount > 0
      ? `${root}/warning/${dueCount}.png`
      : `${root}/common/tick.png`

  return {
    name,
    icon,
    colour: true,
    toolTip,
    menus: [
      {
        title: 'Open in browser',
        browserAction: 'https://dashb.codeite.net/'
      },
      {
        title: 'Overdue',
        dynamicSubMenu: `${root}/tasks/overdue-menu`
      },
      {
        title: 'due',
        dynamicSubMenu: `${root}/tasks/due-menu`
      },
      {
        title: 'Next 10',
        dynamicSubMenu: `${root}/tasks/top-ten-menu`
      }
    ]
  }
}

async function readTaskData() {
  let taskData
  if (cache.data && !cache.expired()) {
    // console.log('tasks using cache')
    taskData = cache.data
  } else {
    const r = await fetch(tasksApi, {
      headers: {
        Cookie: `lists=${listsCookie}`
      }
    })

    if (!r.ok) {
      const mgs = await r.text()
      throw new Error(mgs)
    }

    taskData = await r.json()
    cache.set(taskData, 0)
  }

  const responsibilities = Object.values(taskData)
  const upcoming = upcomingResponsibilities.getResponsibilitiesAfterNow(
    responsibilities,
    10
  )
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

function makeMenu(root, title, tasks) {
  console.log('tasks:', tasks)
  return {
    title,
    menus: tasks.map(x => ({
      title: `${x.done ? '☑' : '☐'} ${x.name}`,
      menus: [
        x.done
          ? {
              title: '☐ Mark incomplete',
              action: `${root}/tasks/status/${x.id}`,
              method: 'POST',
              json: { done: false }
            }
          : {
              title: '☑ Mark done',
              action: `${root}/tasks/status/${x.id}`,
              method: 'POST',
              json: { done: true }
            },
        { title: `deadline: ${moment(x.date).format('YYYY-MM-DD')}` },
        x.dueDate
          ? {
              title: `due: ${moment(x.dueDate).format('YYYY-MM-DD')}`
            }
          : { title: 'due on day' }
      ]
      // GET https://lists.codeite.net/list/~/resps/_/60c48fa0-f89c-11e6-9078-edfe494efaa6
      // PATCH https://lists.codeite.net/list/~/resps/_/60c48fa0-f89c-11e6-9078-edfe494efaa6 {"id":"60c48fa0-f89c-11e6-9078-edfe494efaa6","complete":"0_19"}
    }))
  }
}

function registerRoutes(app) {
  app.post('/tasks/status/:id', bodyParser.json(), async (req, res) => {
    const { id } = req.params
    // console.log('id:', id)
    const [taskId, instanceId] = id.split('_')
    // console.log('taskId, instanceId:', taskId, instanceId)
    const task = await fetch(taskApi(taskId), {
      headers: {
        Cookie: `lists=${listsCookie}`
      }
    }).then(r => r.json())
    // console.log('task:', task)
    const { complete } = task
    const asArray = upcomingResponsibilities.toArray(complete)
    const { done } = req.body
    const patch = {
      id: taskId
    }
    if (done) {
      patch.complete = upcomingResponsibilities.toRange([
        ...new Set(asArray).add(instanceId)
      ])
    } else {
      patch.complete = upcomingResponsibilities.toRange(
        asArray.filter(x => `${x}` !== `${instanceId}`)
      )
    }
    // console.log('patch:', patch)
    const result = await fetch(taskApi(taskId), {
      headers: {
        Cookie: `lists=${listsCookie}`,
        'Content-Type': 'application/json'
      },
      method: 'PATCH',
      body: JSON.stringify(patch)
    }).then(r => r.json())
    // console.log('result:', result)
    res.send()
  })

  app.get('/tasks/top-ten-menu', async (req, res) => {
    try {
      const { upcoming } = await readTaskData()
      const root = `${req.protocol}://${req.get('host')}`
      res.json(makeMenu(root, 'Top Ten', upcoming))
    } catch (e) {
      console.log('e:', e)
      res.status(400).json(e)
    }
  })
  app.get('/tasks/overdue-menu', async (req, res) => {
    try {
      const { upcoming } = await readTaskData()
      const root = `${req.protocol}://${req.get('host')}`
      res.json(makeMenu(root, 'Top Ten', upcoming.filter(x => x.overdue)))
    } catch (e) {
      console.log('e:', e)
      res.status(400).json(e)
    }
  })
  app.get('/tasks/due-menu', async (req, res) => {
    try {
      const { upcoming } = await readTaskData()
      const root = `${req.protocol}://${req.get('host')}`
      res.json(makeMenu(root, 'Top Ten', upcoming.filter(x => x.isDue)))
    } catch (e) {
      console.log('e:', e)
      res.status(400).json(e)
    }
  })
  app.get('/error/:number.png', (req, res) => {
    const data = {
      number: parseInt(req.params.number || 0)
    }
    const { color } = req.query

    registerFont('SF-Pro-Display-Regular.otf', {
      family: 'SF',
      weight: 'regulat'
    })
    registerFont('SF-Pro-Display-Semibold.otf', {
      family: 'SFs',
      weight: 'normal'
    })
    registerFont('SF-Compact-Rounded-Regular.otf', {
      family: 'SFc',
      weight: 'normal'
    })

    const canvas = createCanvas(100, 100)
    const ctx = canvas.getContext('2d')

    ctx.beginPath()
    ctx.arc(50, 50, 38, 0, 2 * Math.PI, false)
    ctx.fillStyle = color || '#B40A28'
    ctx.fill()

    const baseFontSize = 75
    const fontSize =
      data.number === 0
        ? `${baseFontSize}px`
        : `${baseFontSize - 20 * Math.floor(Math.log10(data.number))}px`
    ctx.beginPath()
    ctx.fillStyle = 'white'
    //ctx.font = `${fontSize} sans-serif`
    ctx.font = `${fontSize} "SFs"`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(data.number, canvas.width / 2, canvas.height / 2)

    res.setHeader('content-type', 'image/png')
    res.send(addRes(canvas.toBuffer('image/png')))
  })

  app.get('/warning/:number.png', (req, res) => {
    const data = {
      number: parseInt(req.params.number || 0)
    }
    const { color } = req.query

    const canvas = createCanvas(100, 100)
    const ctx = canvas.getContext('2d')

    ctx.beginPath()
    ctx.arc(50, 50, 38, 0, 2 * Math.PI, false)
    ctx.fillStyle = color || '#F9A758'
    ctx.fill()

    const baseFontSize = 75
    const fontSize =
      data.number === 0
        ? `${baseFontSize}px`
        : `${baseFontSize - 20 * Math.floor(Math.log10(data.number))}px`
    ctx.beginPath()
    ctx.fillStyle = 'white'
    ctx.font = `${fontSize} sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(data.number, 50, 55, 100)

    res.setHeader('content-type', 'image/png')
    res.send(addRes(canvas.toBuffer('image/png')))
  })
}
