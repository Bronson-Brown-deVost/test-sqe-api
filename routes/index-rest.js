const session = require('@controllers/session.controller.js')
const svgf = require('@controllers/scroll-version-group.controller.js')

/**
 * Add each route to this object and it will be servedup automatically.
 */
const routes = {
	"v1/combination": require('@routes/v1/combination.route.js'),
}

/**
 * These are the allowable HTTP verbs for each route.
 * The verb 'find' is for get requests with query parameters.
 */
const verbs = ['get', 'find', 'post', 'put', 'patch','delete']

/**
 * This function loads up all the routes, and sets up
 * corresponding sockets.
 */
module.exports = (app, io) => {
    setupREST(app, io)
    setupConnection(io)
}

const setupConnection = (io) => {
    io.on('connection', (socket) => {
        socket.on('authenticate', async (data) => {
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
                    setupSocket(socket, io)
                } else { // The session_id is not valid.
                    socket.emit('failed', 'Your session_id is not recognized.')
                }
            } else { // The client did not send a session_id, so it becomes public.
                console.log("Unauthenticated socket ", socket.id)
                socket.user_id = 2  // Public user ID 
                socket.session_id = socket.id
                socket.join(socket.id)
                socket.emit('auth', 'you are a public member.')
                setupSocket(socket, io)
            }
        })
    })
}

// Setup all the Websocket functions
const setupSocket = (socket, io) => {
    for(const key in routes) {
        if(routes.hasOwnProperty(key)) {
            for (const verb in routes[key]) {
                console.log(`${socket.id} has the method ${key}-${verb}`)
                if (verbs.indexOf(verb) === -1) console.error(`${key} contains a method ${verb} which is not supported.`)
                switch (verb){
                    case 'get':
                        createGetSock(socket, key, verb)
                        break
                    case 'find':
                        createFindSock(socket, key, verb)
                        break
                    case 'post':
                        createPostSock(socket, io, key, verb)
                        break
                    case 'put':
                        createPutSock(socket, io, key, verb)
                        break
                    case 'patch':
                        createPatchSock(socket, io, key, verb)
                        break
                    case 'delete':
                        createDeleteSock(socket, io, key, verb)
                        break
                }
            }
        }
    }
}

const createGetSock = (socket, key, verb) => {
    socket.on(`${socketKey(key)}-${verb}`, async (data) => {
        if (typeof data === 'string') data = JSON.parse(data)
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
        const {response: response} = await routes[key][verb](data.id, data)
        socket.emit(`returned-${socketKey(key)}-${verb}`, response)
    })
}

const createFindSock = (socket, key, verb) => {
    socket.on(`${socketKey(key)}-${verb}`, async (data) => {
        if (typeof data === 'string') data = JSON.parse(data)
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
        const {response: response} = await routes[key][verb](data)
        socket.emit(`returned-${socketKey(key)}-${verb}`, response)
    })
}

const createPostSock = (socket, io, key, verb) => {
    socket.on(`${socketKey(key)}-${verb}`, async (data) => {
        if (typeof data === 'string') data = JSON.parse(data)
        console.log(data)
        console.log(socket.scroll_version_id, socket.user_id)
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
        const {response: response, broadcast: broadcast} = await routes[key][verb](data)
        if (socket[broadcast]) io.to(socket.session_id).emit(`returned-${socketKey(key)}-${verb}`, response)
        else socket.emit(`returned-${socketKey(key)}-${verb}`, {error: 'Couldn\'t find a channel to broadcast on.  Something went very wrong!'})
    })
}

const createPutSock = (socket, io, key, verb) => {
    socket.on(`${socketKey(key)}-${verb}`, async (data) => {
        if (typeof data === 'string') data = JSON.parse(data)
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
        const {response: response, broadcast: broadcast} = await routes[key][verb](data)
        if (socket[broadcast]) io.to(socket.session_id).emit(`returned-${socketKey(key)}-${verb}`, response)
        else socket.emit(`returned-${socketKey(key)}-${verb}`, {error: 'Couldn\'t find a channel to broadcast on.  Something went very wrong!'})
    })
}

const createPatchSock = (socket, io, key, verb) => {
    socket.on(`${socketKey(key)}-${verb}`, async (data) => {
        if (typeof data === 'string') data = JSON.parse(data)
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
        const {response: response, broadcast: broadcast} = await routes[key][verb](data)
        if (socket[broadcast]) io.to(socket.session_id).emit(`returned-${socketKey(key)}-${verb}`, response)
        else socket.emit(`returned-${socketKey(key)}-${verb}`, {error: 'Couldn\'t find a channel to broadcast on.  Something went very wrong!'})
    })
}

const createDeleteSock = (socket, io, key, verb, next) => {
    socket.on(`${socketKey(key)}-${verb}`, async (data) => {
        if (typeof data === 'string') data = JSON.parse(data)
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
        const {response: response, broadcast: broadcast} = await routes[key][verb](data)
        if (socket[broadcast]) io.to(socket.session_id).emit(`returned-${socketKey(key)}-${verb}`, response)
        else socket.emit(`returned-${socketKey(key)}-${verb}`, {error: 'Couldn\'t find a channel to broadcast on.  Something went very wrong!'})
    })
}

// Setup all the REST functions
const setupREST = (app, io) => {
    for(const key in routes) {
        if(routes.hasOwnProperty(key)) {
            for (const verb in routes[key]) {
                console.log(`${key} has the method ${verb}`)
                if (verbs.indexOf(verb) === -1) console.error(`${key} contains a method ${verb} which is not supported.`)
                switch (verb){
                    case 'get':
                        createGetREST(app, io, key, verb)
                        break
                    case 'find':
                        createFindREST(app, io, key, verb)
                        break
                    case 'post':
                        createPostREST(app, io, key, verb)
                        break
                    case 'put':
                        createPutREST(app, io, key, verb)
                        break
                    case 'patch':
                        createPatchREST(app, io, key, verb)
                        break
                    case 'delete':
                        createDeleteREST(app, io, key, verb)
                        break
                }
            }
        }
    }
}

const createGetREST = (app, io, key, verb) => {
    app.get(`/${key}/:id`, async (req, res, next) => {
        try {
            const {response: response} = await routes[key][verb](req.params.id, req.query)
            res.json(response)
        } catch(err) {
            err = boom.internal(`Server error.`)
        }
        next()
    })
}

const createFindREST = (app, io, key, verb) => {
    app.get(`/${key}`, async (req, res, next) => {
        try {
            const {response: response} = await routes[key][verb](req.query)
            res.json(response)
        } catch(err) {
            err = boom.internal(`Server error.`)
        }
        next()
    })
}

const createPostREST = (app, io, key, verb) => {
    app[verb](`/${key}`, async (req, res, next) => {
        try {
            const {response: response, broadcast: broadcast} = await routes[key][verb](req.body)
            res.json(response)
            if (broadcast) {
                if (broadcast === 'scroll_version_group_id' && req.body.scroll_version_id) {
                    const scroll_version_group_id = await svgf.getScrollVersionGroup(req.body.scroll_version_id, req.body.user_id)
                    if (scroll_version_group_id) io.to(scroll_version_group_id).emit(`returned-${socketKey(key)}-${verb}`, response)
                } else if (broadcast === 'session_id' && req.body.session_id) {
                    io.to(req.body.session_id).emit(`returned-${socketKey(key)}-${verb}`, response)
                }
            }
        } catch(err) {
            err = boom.internal(`Server error.`)
        }
        next()
    })
}

const createPutREST = (app, io, key, verb) => {
    app[verb](`/${key}`, async (req, res, next) => {
        try {
            const {response: response, broadcast: broadcast} = await routes[key][verb](req.body)
            res.json(response)
            if (broadcast) {
                if (broadcast === 'scroll_version_group_id' && req.body.scroll_version_id) {
                    const scroll_version_group_id = await svgf.getScrollVersionGroup(req.body.scroll_version_id, req.body.user_id)
                    if (scroll_version_group_id) io.to(scroll_version_group_id).emit(`returned-${socketKey(key)}-${verb}`, response)
                } else if (broadcast === 'session_id' && req.body.session_id) {
                    io.to(req.body.session_id).emit(`returned-${socketKey(key)}-${verb}`, response)
                }
            }
        } catch(err) {
            err = boom.internal(`Server error.`)
        }
        next()
    })
}

const createPatchREST = (app, io, key, verb) => {
    app[verb](`/${key}`, async (req, res, next) => {
        try {
            const {response: response, broadcast: broadcast} = await routes[key][verb](req.body)
            res.json(response)
            if (broadcast) {
                if (broadcast === 'scroll_version_group_id' && req.body.scroll_version_id) {
                    const scroll_version_group_id = await svgf.getScrollVersionGroup(req.body.scroll_version_id, req.body.user_id)
                    if (scroll_version_group_id) io.to(scroll_version_group_id).emit(`returned-${socketKey(key)}-${verb}`, response)
                } else if (broadcast === 'session_id' && req.body.session_id) {
                    io.to(req.body.session_id).emit(`returned-${socketKey(key)}-${verb}`, response)
                }
            }
        } catch(err) {
            err = boom.internal(`Server error.`)
        }
        next()
    })
}

const createDeleteREST = (app, io, key, verb, next) => {
    app[verb](`/${key}/:id`, async (req, res) => {
        try {
            const {response: response, broadcast: broadcast} = await routes[key][verb](req.body)
            res.json(response)
            if (broadcast) {
                if (broadcast === 'scroll_version_group_id' && req.body.scroll_version_id) {
                    const scroll_version_group_id = await svgf.getScrollVersionGroup(req.body.scroll_version_id, req.body.user_id)
                    if (scroll_version_group_id) io.to(scroll_version_group_id).emit(`returned-${socketKey(key)}-${verb}`, response)
                } else if (broadcast === 'session_id' && req.body.session_id) {
                    io.to(req.body.session_id).emit(`returned-${socketKey(key)}-${verb}`, response)
                }
            }
        } catch(err) {
            err = boom.internal(`Server error.`)
        }
        next()
    })
}

const socketKey = (key) => {
    return key.replace('/', '-')
}