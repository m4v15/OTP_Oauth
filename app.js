const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const request = require('request')
const qs = require('querystring')
const session = require('express-session')

// Your config file should store your client id, client secret given to you by OTP when registering your app
require('dotenv').config()

const app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(cookieParser())

// set up session storage to store the users access token as you need to
// cookie should be set to secure:false for production so that
// the cookie will only be sent back to a https server
app.use(session({
  secret: 'myownsecret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))

// the secure url of OTP that you are trying to access
const userURL = 'http://localhost:3000/users'

// the oauth URLs
// For getting the auth code:
const oauthCodeURL = 'http://localhost:3000/oauth/authorize?'
// For getting the access token:
const oauthTokenURL = 'http://localhost:3000/oauth/token'

// set a random state to make sure of no malacious party interference in oauth requests
const state = 'randomistString'

// In this example our home page controller should make a request to the secure API route
// Checks whether the user is logged in (has a session with accessToken header)
// if not, tell them to log in, or else, get the users
const homePageController = (req, res, next) => {
  if (req.session.accessToken) {
    const getUsersOptions = {
      method: 'GET',
      uri: userURL,
      // set the auth/bearer header as the access token
      auth: { 'bearer': req.session.accessToken }
    }
    return request(getUsersOptions, (err, response) => {
      // note, this is only checking for an error in the request module
      // this will not error if you get back an error as the response from the API
      // you should check for this using the status codes of the response
      if (err) {
        return res.send('Sorry there was an error')
      }
      if (res.statusCode === 200) {
        return res.send(response.body)
      }
    })
  } else {
    return res.send('login via oauth on OTP at /login')
  }
}

// Login redirects to oauth login with the apps client secret and redirect URI
// as well as with the random state we have made
const loginController = (req, res, next) => {
  const queries = {
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    state
  }
  const queriesStringified = qs.stringify(queries)
  res.redirect(oauthCodeURL + queriesStringified)
}

// Token makes a post requiest to oauth/token to get the token back, using the access code retrieved from
// the OTP, as query parameters on our redirect uri. Also needed are
// the rest of our clients own variables (given to you when you register the app on OTP)
const tokenController = (req, res, next) => {
  const redirectQueries = req.query
  // check the state in the query params match
  if (redirectQueries.state !== state) {
    return res.send('Someone is trying to do something naughty')
  }
  // get the auth code
  const code = redirectQueries.code

  // set the rest of our variables
  const tokenQueries = {
    code,
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uri: process.env.REDIRECT_URI,
    grant_type: 'authorization_code'
  }

  // the variables must be sent in the payload (body) of the post request, as a querystring
  const tokenRequestOptions = {
    method: 'POST',
    uri: oauthTokenURL,
    body: qs.stringify(tokenQueries),
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    }
  }

  request(tokenRequestOptions, (err, response, body) => {
    if (err) {
      return res.send('Sorry there was an error logging onto the OTP')
    }
    const parsedBody = JSON.parse(body)
    // store the access token in the session memory and redirect back to the home page!
    // SECURITY WARNING this may not be the most secure way to store your token
    // you may want to encrypt and store the access token in another way
    req.session.accessToken = parsedBody.access_token
    res.redirect('/')
  })
}

app.get('/', homePageController)
app.get('/login', loginController)
app.get('/token', tokenController)

const port = process.env.PORT || 8000

// start the app
app.listen(port, err => {
  if (err) {
    throw err
  }
  console.log(`Server listening on port ${port}`)
})
