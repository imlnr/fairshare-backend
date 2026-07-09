const express = require("express")
const { getApplication } = require("./dist/bootstrap")

const proxy = express()
let appPromise = null

proxy.use((req, res, next) => {
  if (!appPromise) {
    appPromise = getApplication()
  }

  appPromise.then((app) => app(req, res, next)).catch(next)
})

module.exports = proxy
