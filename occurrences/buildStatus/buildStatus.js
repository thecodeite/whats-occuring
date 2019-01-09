const fetch = require('node-fetch')

const DataCache = require('../../shared/DataCache')
const { inWorkHours } = require('../../shared/timesHelper')
const { getIcon } = require('./images')

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

  let icon = ''
  let toolTip = ''
  if (master) {
    toolTip = master.status
    if (master.status === 'running')
      icon = `${root}/build-status/building-building.png`
    if (master.status === 'success')
      icon = `${root}/build-status/building-good.png`
    if (master.status === 'failed')
      icon = `${root}/build-status/building-bad.png`
  }

  return {
    name,
    icon,
    colour: true,
    toolTip,
    usesCache: true
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
}
