require('dotenv').config()

const express = require('express')


const common = require('./shared/common')
const services = [
  require('./occurrences/fitbit/fitbit'),
  require('./occurrences/workTimer/workTimer'),
  require('./occurrences/tasks/tasks')
]


const app = express()

app.use((req, res, next) => {
  const output = [req.method, req.path]
  if (Object.keys(req.query).length) output.push(req.query)
  console.log(...output)
  next()
})

app.get('/', async (req, res) => {
  const root = `${req.protocol}://${req.get('host')}`

  try {
    const occurrences = (await Promise.all(
      services.map(s => {
        try {
          return s.makeOccurrence(root)
        } catch (e) {
          console.error('e:', e)
        }
      })
    )).filter(x => x)
    res.json({
      occurrences
    })
  } catch (e) {
    console.trace(e)
    res.status(500).send({ error: e.toString() })
  }
})



services.map(({ name }) => {
  app.get(`/${name}`, async (req, res) => {
    const root = `${req.protocol}://${req.get('host')}`

    try {
      const occurrence = s.makeOccurrence(root)
      res.json({
        occurrence
      })
    } catch (e) {
      console.trace(e)
      res.status(500).send({ error: e.toString() })
    }
  })

  app.post(`/${name}`, async (req, res) => {
    const root = `${req.protocol}://${req.get('host')}`

    try {
      const occurrence = s.makeOccurrence(root, true)
      res.json({
        occurrence
      })
    } catch (e) {
      console.trace(e)
      res.status(500).send({ error: e.toString() })
    }
  })
})

app.use('/public', express.static('public'))

const port = parseInt(process.env.PORT || 'port', 10)

Promise.all(
  services.map(async s => {
    const init = s.init || (() => Promise.resolve())
    await init()
    s.registerRoutes(app)
    common.registerRoutes(app)
  })
)
  .then(() => {
    app.listen(port, e => {
      if (e) console.error(`Failed to listen on port ${port}:`, port)
      else console.log(`Head to port ${port} to feel the shizzle`)
    })
  })
  .catch(e => {
    console.error('init failed')
    console.error(e)
  })
