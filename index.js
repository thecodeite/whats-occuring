require('dotenv').config()

const express = require('express')

const fitbit = require('./fitbit')
const workTimer = require('./workTimer')

const app = express()

app.use((req, res, next) => {
  const output = [req.method, req.path]
  if (Object.keys(req.query).length) output.push(req.query)
  console.log(...output)
  next()
})

fitbit.registerRoutes(app)
workTimer.registerRoutes(app)

app.get('/', async (req, res) => {
  const root = `${req.protocol}://${req.get('host')}`

  try {
    const occurences = await Promise.all([
      workTimer.makeOccurance(root),
      fitbit.makeOccurance(root)])
    res.json({
      occurences
    })
  } catch(e) {
    console.trace(e)
    res.status(500).send({error: e.toString()})
  }
})


app.use('/public', express.static('public'))

app.listen(12011, e => {
  if (e) console.error('Failed to listen on port 12011:', 12011)
  else console.log('Head to 12011 to feel the shizzle')
})