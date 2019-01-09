const SUNDAY = 0
const SATURDAY = 6

module.exports = {
  inWorkHours() {
    // Hide on weekends and outside of 08:00-18:00
    const now = new Date()
    const day = now.getDay()
    if (day === SUNDAY || day === SATURDAY) {
      return false
    }

    const hour = now.getHours()
    if (hour < 8 || hour > 18) {
      return false
    }

    return true
  }
}
