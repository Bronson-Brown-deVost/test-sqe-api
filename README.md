# Testing SQE API using express.js

This testing server makes minimal usage of the features in Express.js, thus making transition of the working to some other framework less complicated (for instance if we want to support server side events in the future).  The project was financed by the [Scripta Qumranica Electronica (SQE) project](https://qumranica.org) and provides an HTTP and websocket API targeted for the SQE database.  The framework may be of general interest, however, to anyone wishing to create abare-bones, "batteries not included" analogue to [Feathers.js](https://feathersjs.com/).

## Entry point

The server starts at app.js, which loads up the express.jserver.  Express uses a "middleware" concept which means that "services" are placed into a chain, in which the first loaded module performs an action and then passes the request on to the next service in the chain.  So the order in which you insert modules with app.use (or app.get/post/etc.) really matters.  That is why we load up `app.post('/login', require('@routes/login.route.js').validate)` before `app.use(require('@services/session-manager.service').sessionManager)`, so that login requests don't get booted out by the `sessionManager` module.

## Referencing Javascript files

It can be tedious (and dangerous) to load Javascript files with references like '../../../../the_thing/I_need.js', since we may move folders, or incorrectly count the number of '../'.  So in `package.json` you will find a section '_moduleAliases' which allows you to create aliases to get to commonly used folders, thus using '@config' in a `require('@config/my-cool-info.json')` will get you immediately to `(project root)/config/my-cool-info.json` without needing to use `require('../../../../my-cool-info.json')` or the like.

Also, once you `require` a file in Node, when you `require` it again, you will generally get the same instance of that module.  It is basically a singleton (see below on the database pool).

## Middleware

### The basics of chaining functions

Each module in the chain gets called with 3 (or 4) parameters: req, res, next.  Which contain the HTTP request, the HTTP response, and a call to pass those values to the next module via next().

```javascript
app.use((req, res, next) => {
    res.newInfo = 'Some cool new info.'  //This gets added to the response
    next() //Send the request to the next module in the chain
})
```

```javascript
app.use((req, res, next) => {
    return res.newInfo = 'Some coolnew info.'  //This gets added to the response, stops the chain, and send the request back immediately.
})
```

If you place a value into the next() function call, like next('things went wrong...') then that signals an error and the request will go straight to the first error handler, which has 4 variables: err, req, res, next:

```javascript
app.use((err, req, res, next) => {
    return res.status(err.output.statusCode).json(err.output.payload);
})
```

### Routes

Adding new routes is really simple using the Express.js convenience methods:

```javascript
app.get( // Responds only to GET requests
  '/new', // This is the path of the endpoint: http://localhost:PORT/new
  (req, res, next) => {
    res.newInfo = 'Some cool new info.'  //This gets added to the response of a GET request.
    next() //Send the request to the next module in the chain
})
```

```javascript
app.post( // Responds only to POST requests
  '/new', // This is the path of the endpoint: http://localhost:PORT/new
  (req, res, next) => {
    res.newInfo = 'Some cool new info.'  //This gets added to the response of a POST request.
    next() //Send the request to the next module in the chain
})
```

I set up a little template system to make things even easier.  Basically you can use `yarn generate-route -- -n my-new-endpoint -v v1` to add a new endpoint.  The endpoint will be /v1/my-new-endpoint.  We add a file to `/routes/v1` called `my-new-endpoint.route.js` with an automatically created template containing several possible endoints (they are basically REST/CRUD: get and find [= Read], post [= Create], replace [= Update/Patch], update, and delete).  You can use these or create your own.  Any function with `exports.`, like `exports.my-cool-function`, will be turned automatically into an endpoint `http://localhost:PORT/v1/my-new-endpoint/my-cool-function`.  Basically, this convenience script adds an entry in `/routes/index.js` in the `routes` variable that points to the newly created file `my-new-endpoint.route.js`. `index.js` then reads that file, creates an endpoint for each exported function and sets up a Websocket interface for it as well.  It is best to let `index.js` create the endpoint, since this is very DRY and does all the hard work for you.  Also `yarn delete-route -- -n my-new-endpoint -v v1` will do everything necessary to delete that new endpoint you just created.

Because `index.js` creates corresponding HTTP endpoints and Websocket responders authomatically, you create your function once in the route file and it becomes accessible via HTTP or Websocket.  What is more, all HTTP requests that mutate the database will send a websocket message to all relevant parties, so whether performing the update via HTTP or Websocket, the update gets broadcast to all relevant parties (this is like Feathers.js, but without the magic and lock-in).

For this to work properly, in your new function, you must specify and return a `broadcast` variable (which is just a string; either '', 'session_id', or 'scroll_version_group_id').  If `broadcast` is empty, then the request only goes back to the person requesting it, if it is 'session_id', then the session_id is looked up automatically and the request is broadcast in the room with that session_id (I think of these as channels, but the websocket work calls them "rooms"), if it is 'scroll_version_group_id', then the scroll_version_group_id is looked up automatically and the request is broadcast to everyone in that room.

## Database

I setup a modules in the `(project root)/db` folder called `sqe-mariadb.js`, which uses the [official MariaDB Node.js connector](https://mariadb.com/kb/en/library/about-mariadb-connector-nodejs/).  Once it is loaded, it created a pool of database connections, which can be accessed via convenience functions.  Since requiring files in Node basically creates a singleton (see above), you can just require this file anywhere and you will get the already existing instance of it with the preloaded pool. It should be expanded if we continue in this direction.  I added a transaction handler for multiple queries that should be handled as part of a single transaction.  We would need something for prepared queries too.  Perhaps other conveniences.

## Controllers

It is best to put any real logic into a controller (see `(project root)/controllers`), which you can import into a route.  This makes the logic reusable and  extensible.  Then the route can import any controllers it needs and use them.  Maybe Ingo can recreate the fancy query cosnstructers from the PERL version of the API.  Others could use an ORM (or knex or something).

## Services

Anything high-level, like the session manager middleware could go into the `(project root)/services` folder.

## Making everything run

You can use `yarn dev` to start the API at PORT 3030, or whatever you set in `config/shared-vars.config.json`.  This will restart the server whenever you make changes to the filesystem (hotreload).  If you use `yarn start` it will start the API, but without hot reloading.

## Extending

I guess this API would eventually be placed behind a load balancer.  It is in principal stateless, so you could spin up as many instances as desireble depending on load.  Websockets can horizontally scale with something a central pub/sub like https://github.com/socketio/socket.io-redis (or maybe they make a Kafka connector to do the same thing).  If we need to scale the DB, that can be done as well with slaves.  The API simply sits in the middle.

## Coding style

Express has been around for a long time now, and uses the traditional callbacks and Javascript style.  In this API, I tend to use arrow functions and async/await to make the logic easier to understand and to fall in line with more modern styles (I use `const` and `let` instead of `var` as well).

### Arrow function

There are several ways to define functions in Javascript these days.  I tend to prefer the arrow functions, since it tends to automatically preserve scope (and bind to `this`) in the way you would expect.

```Javascript
function() {
    console.log(this.coolMessage)
}.bind(this))
```

is equivalent to:

```Javascript
() => {
  console.log(this.coolMessage)
}
```

This is very helpful when you need to nest callbacks and would otherwise descend into [callback hell](http://callbackhell.com/).

You can use this when declaring functions or when creating callbacks:

```Javascript
const myCoolFunction = (var1, var2) => {
  return var1 + var2
}

const someObject = {
  var1: 1,
  var2: 2,
  customAdd: (a, b) => {
    return a + b
  },
  doSomethingMore: (a, b, cb) => {
    return cb(a, b, a + b)
  }
}

console.log(`A simple function returns: ${myCoolFunction(5, 8)}`)

someObject.doSomethingMore(2, 4, (a, b, sum) => {
  console.log(`The sum of ${a} and ${b} is ${sum}`)
})
```

### Async

One of the big benefits of Javascript is its first-class suport for asynchronous operations.  This was initially achieved with callbacks, later updated with Promises, then transitioned to async/await.  The following three examples do basically the same thing:

#### Callback

```Javascript
function longRunningFunc(message, cb) {
  setTimeout(function() {cb(message)}, 3000)
}

// This starts a task, but doesn't block the rest of the code from running
longRunningFunc('I took a long time to finish.', function(result) {
  console.log(result)
})

console.log('I didn\'t get blocked from running!')
```

#### Promise

Note how much easier error handling is.

```Javascript
function longRunningFunc(message) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (1 !== 1) {
        reject('The world makes no sense anymore.')
      } else {
        resolve(message)
      }
    }, 3000)
  }) 
}

// This starts a task, but doesn't block the rest of the code from running
longRunningFunc('I took a long time to finish.')
  .then((message) => {
    console.log(message)
  })
  .catch(error => console.error(error))   // Here is a really shorthand way to write an arrow function
                                          // It only works with one variable and one statement.

console.log('I didn\'t get blocked from running!')
```

#### Async/await

The try/catch syntax is more similar to other languages.  You can only use `await` inside of an `async` function.  You can fire up as many `await`able functions as you want to run cuncurrently, then you can `await` them in any order, or all at once with Promise.all.

```Javascript
const longRunningFunc = (message) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (1 !== 1) {
        reject('The world makes no sense anymore.')
      } else {
        resolve(message)
      }
    }, 3000)
  }) 
}

(async () => {
  try {
    const msg = longRunningFunc('I took a long time to finish.') // This starts a task, but doesn't block the rest of the code from running
    console.log('I didn\'t get blocked from running!')
    console.log(await msg) // await tells our code to stop and wait for longRunningFunc to finish
  } catch(error) {
    console.error(error)
  }
})()
```
