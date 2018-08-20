
const fs = require('fs-extra')
const { addRes } = require('./helpers')

module.exports.registerRoutes = function registerRoutes (app) {
  app.get('/common/tick.png', async (req, res) => {
    const buffer = await fs.readFile('./public/tick-100px.png')
    res.setHeader('content-type', 'image/png')
    res.send(addRes(buffer))
  })

  app.get('/common/cross.png', async (req, res) => {
    const buffer = await fs.readFile('./public/cross-100px.png')
    res.setHeader('content-type', 'image/png')
    res.send(addRes(buffer))
  })
}