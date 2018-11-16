const session = require('@controllers/session.controller.js')
const svgf = require('@controllers/scroll-version-group.controller.js')
const sharedVars = require('@config/shared-vars.config.json')

/**
 * Add each route to this object and it will be servedup automatically.
 */
const routes = {
	"v1/combination": require('@routes/v1/combination.route.js'),
}

/**
 * This function loads up all the HTTP routes, and sets up
 * corresponding sockets.
 */
module.exports = (app, io) => {
    setupHTTP(app, io)
    setupSocketConnection(io)
}

// Setup all the HTTP functions
const setupHTTP = (app, io) => {
    for(const key in routes) {
        if(routes.hasOwnProperty(key)) {
            for (const verb in routes[key]) {
                console.log(`${key} has the method ${verb}`)
                createEndpoint(app, io, key, verb)
            }
        }
    }
}

const createEndpoint = (app, io, key, verb) => {
    app.post(`/${key}-${verb}`, async (req, res, next) => {
        try {
            const {response, broadcast} = await routes[key][verb](req.body)
            res.json({...response, payload: req.body})
            if (broadcast) { // Broadcast HTTP results to registered Websockets
                broadcastToSockets(response, broadcast, io, key, verb, req.body)
            }
        } catch(err) {
            err = boom.internal(`Server error.`)
        }
        next()
    })
}

// TODO Right now we do send the (sanitized) payload to connected sockets.
// Do we really need to do this?
const broadcastToSockets = async (response, broadcast, io, key, verb, data) => {
    data.transaction = `${key}-${verb}` // Convert the HTTP route to a Websocket transaction.
    if (broadcast === 'scroll_version_group_id' && data.scroll_version_id) {
        const scroll_version_group_id = await svgf.getScrollVersionGroup(data.scroll_version_id, data.user_id)
        if (scroll_version_group_id) {
            data.session_id = '' // Sanitize the payload before broadcast
            io.to(scroll_version_group_id).emit(`returned-${key}-${verb}`, {...response, payload: data})
        }
    } else if (broadcast === 'session_id' && data.session_id) {
        io.to(data.session_id).emit(`returned-${key}-${verb}`, {...response, payload: data})
    }
}

// Setup the socket endpoint
const setupSocketConnection = (io) => {
    io.on('connection', (socket) => {
        socket.on('authenticate', async (data) => {  // This is a one time authenticator for Websocket connections.
            socket.leaveAll()
            if (typeof data === 'string') data = JSON.parse(data)
            if (data.session_id) {  // The client sent a session_id.
                const user = await session.validateSession(data.session_id)
                if (user.length > 0) { // The session_id is valid.
                    console.log("Authenticated socket ", socket.id)
                    socket.user_id = user[0].user_id
                    socket.session_id = data.session_id
                    socket.join(data.session_id)
                    socket.emit('auth', `you are a real member, with session ${socket.session_id}.`)
                    createSocketEndpoint(socket, io)
                } else { // The session_id is not valid.
                    socket.emit('failed', 'Your session_id is not recognized.')
                }
            } else { // The client did not send a session_id, so it becomes public.
                console.log("Unauthenticated socket ", socket.id)
                socket.user_id = sharedVars.public_id  // Public user ID 
                socket.session_id = socket.id // Their session ID is just the unique socket.id
                socket.join(socket.id)
                socket.emit('auth', 'you are a public member.')
                createSocketEndpoint(socket, io)
            }
        })
    })
}

const createSocketEndpoint = (socket, io) => {
    socket.on('request', async (data) => {
        if (typeof data === 'string') data = JSON.parse(data)
        const [key, verb] = data.transaction.split('-')
        if (routes[key] && routes[key][verb]) {
            if (data.scroll_version_id && (!socket.scroll_version_id || data.scroll_version_id !== socket.scroll_version_id)) {
                socket.scroll_version_id = data.scroll_version_id
                const scroll_version_group_id = await svgf.getScrollVersionGroup(socket.scroll_version_id, socket.user_id)
                if (scroll_version_group_id > 0) {
                    socket.scroll_version_group_id = scroll_version_group_id
                    socket.leaveAll()
                    socket.join(socket.session_id)
                    socket.join(socket.scroll_version_group_id)
                } else socket.scroll_version_group_id = ''
            }
            const {response, broadcast} = await routes[key][verb](data)
            // TODO Right now we do send the (sanitized) payload to connected sockets.
            // Do we really need to do this?
            if (broadcast) {
                if (broadcast !== 'session_id') data.session_id = '' // Remove the session_id when broadcasting anywhere but the "session_id" room
                if (socket[broadcast]) io.to(socket[broadcast]).emit(`returned-${key}-${verb}`, {...response, payload: data}) // Send reponse to broadcast room
                else socket.emit(`returned-${key}-${verb}`, {error: 'Couldn\'t find a room to broadcast on.  Something went very wrong!'})
            } else socket.emit(`returned-${key}-${verb}`, {...response, payload: data})  // Send response directly to socket, when not broadcast.
        } else socket.emit('error', {error: `Unknown endpoint ${data.transaction}.`})
    })
}