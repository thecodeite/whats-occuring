require('dotenv').config()

const express = require('express')

const services = [
  require('./occurences/fitbit/fitbit'),
  require('./occurences/workTimer/workTimer'),
  require('./occurences/tasks/tasks')
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
    const occurences = await Promise.all(
      services.map(s => s.makeOccurance(root))
    )
    res.json({
      occurences
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
      const occurence = s.makeOccurance(root)
      res.json({
        occurence
      })
    } catch (e) {
      console.trace(e)
      res.status(500).send({ error: e.toString() })
    }
  })

  app.post(`/${name}`, async (req, res) => {
    const root = `${req.protocol}://${req.get('host')}`

    try {
      const occurence = s.makeOccurance(root, true)
      res.json({
        occurence
      })
    } catch (e) {
      console.trace(e)
      res.status(500).send({ error: e.toString() })
    }
  })
})

app.use('/public', express.static('public'))

Promise.all(
  services.map(async s => {
    const init = s.init || (() => Promise.resolve())
    await init()
    s.registerRoutes(app)
  })
)
  .then(() => {
    app.listen(12011, e => {
      if (e) console.error('Failed to listen on port 12011:', 12011)
      else console.log('Head to 12011 to feel the shizzle')
    })
  })
  .catch(e => {
    console.error('init failed')
    console.error(e)
  })
