const pathLib = require('path')
const fs = require('fs-extra')
const fetch = require('node-fetch')
const mockRepo = []
// if (process.env['MOCKS'] !== 'true') {
//   return fetch
// } else {


//
// }

const mockFetch = async function (address, options) {
  if (!mockRepo.length) {
    await readMocks()
  }

  if (!options) options = {}
  if (!options.method) options.method = 'GET'

  const match = mockRepo.find(matchMock(address, options))

  if (match) {
    return new Response(match)
  } else {
    throw new Error('getaddrinfo ENOTFOUND')
  }
}

function matchMock(address, options) {
  return function (mock) {
    const {matchUrl, matchMethod} = mock.request
    if (typeof matchUrl === 'string' && !eqIgCase(matchUrl, address)) return fail('matchUrl', matchUrl, address)
    if (matchUrl instanceof RegExp && !matchUrl.test(address)) return fail('matchUrl', matchUrl, address)
    if (typeof matchMethod === 'string' && !eqIgCase(matchMethod, options.method)) return fail('matchMethod', matchMethod, options.method)
    if (matchMethod instanceof RegExp && !matchMethod.test(options.method)) return fail('matchMethod', matchMethod, options.method)
    return true
  }
}

function eqIgCase(a, b) {
  return `${a}`.toUpperCase() === `${b}`.toUpperCase()
}

function fail(type, matcher, value) {
  console.log(`${type}: Matcher (${matcher}) did not match (${value})`)
}

class Response {
  constructor (match) {
    this.match = match
  }

  async json() {
    await Promise.resolve()
    const {body} = this.match.response
    if (typeof body === 'null' || typeof body === 'undefined') return null
    if (typeof body === 'string') return JSON.parse(body)
    else if (typeof body === 'object') return body
    else return null
  }
  async text() {
    await Promise.resolve()
    const {body} = this.match.response
    if (typeof body === 'null' || typeof body === 'undefined') return null
    if (typeof body === 'string') return body
    else if (typeof body === 'object') return JSON.stringify(body)
    else return null
  }
}

async function readMocks() {
  const mockDir = './mocks'
  const files = await fs.readdir(mockDir)
  console.log('files:', files)

  for(file of files) {
    console.log('file:', file)
    if (/mock.*\.json/.test(file)) {
      const path = pathLib.join(mockDir, file)
      try {
        const mocks = await fs.readJson(path)
        if (Array.isArray(mocks)) {
          for(mock of mocks) {
            if (isValid(mock)) {
              mockRepo.push(mock)
            }
          }
        }
      } catch (e) {
        console.log('Cant read file', path, e)
      }
    } else if (/mock.*\.js/.test(file)) {
      const path = pathLib.join(mockDir, file)
      try {
        const mocks = require('./' + path)
        if (Array.isArray(mocks)) {
          for(mock of mocks) {
            if (isValid(mock)) {
              mockRepo.push(mock)
            }
          }
        }
      } catch (e) {
        console.log('Cant read file', path, e)
      }
    }
  }

  console.log('mockRepo.length:', mockRepo.length)
}

function isValid(mock) {
  if(mock && mock.request && Object.keys(mock.request).length > 0 && mock.response) return true
  if (!mock) return console.log('Empty value')
  if (!mock.request) return console.log('request missing')
  if (!mock.response) return console.log('response missing')
}

(async function () {
  try {
    await mockFetch("https://fitbit.com").then(json).then(expect({home: 'page'}))
    await mockFetch("https://fitbit.com").then(text).then(expect('{"home":"page"}'))
    await mockFetch("https://fitbit.com").then(r => expect(200, r.status))
    await mockFetch("https://fitbit.com/404").then(r => expect(200, r.status))
    //   .then(rp)
    // await mockFetch("https://fitbit.com/feedback")
    //   .then(text)
    //   .then(rp)
  } catch (e) {
    console.error(e)
  }
})()

function text(r) {
  //console.log('r:', r)
  return r.text()
}

function json(r) {
  // console.log('r:', r)
  return r.json()
}

function expect(expected, res) {
  const cont = function (result) {
    console.log('result:', result)
    assert(JSON.stringify(result) === JSON.stringify(expected), `${JSON.stringify(result)} !== ${JSON.stringify(expected)}`)
  }

  if (res === undefined) {
    return cont
  } else {
    cont(res)
    return () => {}
  }
}

function assert(condition, message) {
  if(!condition) throw new Error('Assertion failed: '+ message)
}
