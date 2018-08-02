const fs = require('fs-extra')

class DataCache {
  constructor(name) {
    this.cacheFile = `./${name}.cache`
    this.name = name
  }

  now () {
    return (new Date()).getTime()
  }

  async init () {
    try {
      const {data, expires} = JSON.parse(await fs.readFile(this.cacheFile))
      this.data = data
      this.expires = expires
    } catch (e) {
      this.data = null
      this.expires = 0
    }

    console.log(`Cache ${this.name} init with`, JSON.stringify(this).slice(0, 50))
  }

  async set (data, secondsValid) {
    this.data = data
    const expires = this.expires = (new Date()).getTime() + secondsValid * 1000
    return await fs.writeFile(this.cacheFile, JSON.stringify({data, expires}, null, '  '))
  }

  expired () {
    // console.log('this.expires , (new Date()).getTime(), this.expires > (new Date()).getTime():', this.expires, (new Date()).getTime(), this.expires > (new Date()).getTime())
    return (new Date()).getTime() > this.expires
  }
}

module.exports = DataCache