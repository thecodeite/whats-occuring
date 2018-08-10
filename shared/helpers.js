const rewrite_pHYs_chunk = require('./rewrite_pHYs_chunk')

function addRes(buffer) {
  // dots per inch
  var dpi = 350;
  // pixels per metre
  var ppm = Math.round(dpi / 2.54 * 100);
  const after = rewrite_pHYs_chunk(buffer, ppm, ppm);
  return after
}

module.exports = {
  addRes
}