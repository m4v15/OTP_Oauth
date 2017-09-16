const app = require('./app.js')

const port = process.env.PORT || 8000

// connect to the db
app.listen(port, err => {
  if (err) {
    throw err
  }
  console.log(`Server listening on port ${port}`)
})
