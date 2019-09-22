const pdf = x => {
  const b = 1 / (Math.E * Math.PI)
  return 1 / Math.sqrt(2 * Math.PI * b) * Math.pow(Math.E, -Math.pow(x, 2) / (2 * b))
}

module.exports = {
  pdf
}
