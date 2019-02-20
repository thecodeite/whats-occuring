const fetch = require('node-fetch')

const DataCache = require('../../shared/DataCache')
const { inWorkHours } = require('../../shared/timesHelper')
const { getIcon, getIcon2 } = require('./images')

const name = 'buildStatus'
const gitlabToken = process.env['GITLAB_TOKEN']

module.exports = {
  name,
  init,
  registerRoutes,
  makeOccurrence,
  shouldShow: inWorkHours
}

const cache = new DataCache('buildStatus')
async function init() {
  return await cache.init()
}

async function makeOccurrence(root, clearCache) {
  const buildStatus = await readBuildStatusData(clearCache)
  const master = buildStatus.find(x => x.ref === 'master')
  const menus = []
  let icon = ''
  let toolTip = ''
  if (master) {
    toolTip = master.status
    if (master.status === 'running')
      icon = `${root}/build-status/building-building.png`
    if (master.status === 'success' || master.status === 'manual')
      icon = `${root}/build-status/building-good.png`
    if (master.status === 'failed')
      icon = `${root}/build-status/building-bad.png`

    menus.push({
      title: 'Open in browser',
      browserAction: master.web_url
    })
  }

  // const menus = [
  //   // {
  //   //   title: 'Link',
  //   //   dynamicSubMenu: `${root}/build-status/pipelines-menu`
  //   // }

  // ]

  return {
    name,
    icon,
    colour: true,
    toolTip,
    usesCache: true,
    menus
  }
}

async function readBuildStatusData() {
  const data = await fetch(
    'https://jl.githost.io/api/v4/projects/1126/pipelines',
    {
      headers: { 'PRIVATE-TOKEN': gitlabToken }
    }
  ).then(r => r.json())

  return data
}

function registerRoutes(app) {
  app.get('/build-status/building-building.png', getIcon('building'))
  app.get('/build-status/building-good.png', getIcon('good'))
  app.get('/build-status/building-bad.png', getIcon('bad'))
  app.get('/small-screen.png', getIcon2())

  // app.get('/build-status/pipelines-menu', (req, res) => {
  //   const root = `${req.protocol}://${req.get('host')}`
  //   const now = moment()
  //   const remainder = now.minute() % 5
  //   const nowIsh = moment(now).add(-remainder, 'minutes')
  //   res.json({
  //     menus: [
  //       {
  //         title: `Now (${now.format('HH:mm')})`,
  //         action: `${root}/work-timer/start`,
  //         method: 'POST',
  //         json: payload(now.hours(), now.minutes())
  //       },
  //       {
  //         title: `Now ish(${nowIsh.format('HH:mm')})`,
  //         dynamicSubMenu: `${root}/work-timer/now-menu`,
  //         action: `${root}/work-timer/start`,
  //         method: 'POST',
  //         json: payload(nowIsh.hours(), nowIsh.minutes())
  //       },
  //       {
  //         title: 'Common Times',
  //         staticSubMenu: `${root}/work-timer/common-times`
  //       },
  //       {
  //         title: 'All Start times',
  //         staticSubMenu: `${root}/work-timer/all-times`
  //       }
  //     ]
  //   })
}
