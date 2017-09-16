const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const cookieParser = require('cookie-parser')
const request = require('request')
require('dotenv').config()
const qs = require('querystring')
const session = require('express-session')



const app = express()

app.use(cors())
app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json({ extended: true }))
app.use(cookieParser())
app.use(session({
  secret: 'keyboard secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))

const userURL = 'http://localhost:3000/users'

const oauthBaseURL = 'http://localhost:3000/oauth/authorize?'
const oauthTokenURL = 'http://localhost:3000/oauth/token'

let getUsersOptions = {
  method: 'GET',
  uri: userURL
}

const state = 'randomistString'
const queries = {
  client_id: process.env.CLIENT_ID,
  redirect_uri: process.env.redirectUri,
  state
}


// Home page controller checks whether the user is logged in (has a session)
// if not, tell them to log in, or else, get the users
const homePageController = (req, res, next) => {

  if (req.session.accessToken) {
    getUsersOptions.auth = { 'bearer': req.session.accessToken }
    return request(getUsersOptions, (err, response) => {
      if (err || response.statusCode !== 200) {
        console.log('fail')
        console.log(response)
        return res.send('Sorry there was an error')
      }
      console.log('success!')
      return res.send(response.body)
    }) 
  } else {
    return res.send('login via oauth on OTP: http://8000/login')
  }
}

// Login redirects to oauth login with the apps client secret
const loginController = (req, res, next) => {
  console.log(req.headers)
  const queriesStringified = qs.stringify(queries)
  res.redirect(oauthBaseURL + queriesStringified)
}

// Token makes a post requiest to oauth/token to get the token back, using the access code retrieve from the login
// and the rest of our clients own variables (given to you when you register the app on OTP)
const tokenController = (req, res, next) => {
  const redirectQueries = req.query
  if (redirectQueries.state !== state){
    return res.send('Someone is trying to do something naughty')
  }
  const code = redirectQueries.code

  const tokenQueries = {
    code,
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uri: process.env.redirectUri,
    grant_type: 'authorization_code'
  }

  tokenRequestOptions = {
    method: "POST",
    uri: oauthTokenURL,
    body: qs.stringify(tokenQueries),
    headers: {
      'content-type': "application/x-www-form-urlencoded"
    }
  }

  request(tokenRequestOptions, (err, response, body) =>{
    if (err) {
      console.log('fail getting token')
      return res.send('Sorry there was an error')
    }
    const parsedBody = JSON.parse(body)
    req.session.accessToken = parsedBody.access_token   
    res.redirect('/')
  })
}

app.get('/', homePageController)
app.get('/login', loginController)
app.get('/token', tokenController)

module.exports = app
