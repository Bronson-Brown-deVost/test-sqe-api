require('module-alias/register')
const vars = require('@config/shared-vars.config.json')
const express = require('express')
const app = express()
const server = app.listen(vars.port)
const boom = require('boom')
const helmet = require('helmet')
app.use(helmet())
const cors = require('cors')
app.use(cors())
const compress = require('compression')
app.use(compress())
const bodyParser = require('body-parser')
app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
const io = require('socket.io')(server)
app.post('/login', require('@routes/login.route.js').validate) // We load up the login route here, so the sessionManager does not run on it.
app.use(require('@services/session-manager.service').sessionManager)
// const path = require('path')

require('@routes')(app, io)

app.use((err, req, res, next) => {
    return res.status(err.output.statusCode).json(err.output.payload);
})