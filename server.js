const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const mongo = require('mongodb')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


// connect  to mongoDB
const uri = process.env.MONGO_URI;
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
});

const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error: '));
connection.once('open', () => {
  console.log("MongoDB connection successful.");
});

//user, exercise schemas and models
let exerciseSchema = new mongoose.Schema({
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: String
});

let userSchema = new mongoose.Schema({
  username: {type: String, required: true},
  log: [exerciseSchema]
});

let exerciseModel = mongoose.model('exerciseModel', exerciseSchema);
let userModel = mongoose.model('userModel', userSchema);

//create user
app.post('/api/exercise/new-user', bodyParser.urlencoded({ extended: false }), (req, res) => {
  let newUser = new userModel({username: req.body.username})
  newUser.save((err, savedUser) => {
    if(!err) {
      let responseObj = {}
      responseObj['username'] = savedUser.username
      responseObj['_id'] = savedUser.id
      res.json(responseObj)
    }
  })
})

//get all users
app.get('/api/exercise/users', (req, res) => {
  userModel.find({}, (err, arrayOfUsers) =>{
    if(!err) {
      res.json(arrayOfUsers)
    }
  })
})

//add exercise
app.post('/api/exercise/add', bodyParser.urlencoded({ extended: false }), (req, res) => {
  let newExercise = new exerciseModel({
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date
  })

  if (newExercise.date === '') {
    newExercise.date = new Date().toISOString().substring(0, 10)
  }

  userModel.findByIdAndUpdate(
    req.body.userId,
    {$push: {log: newExercise}},
    {new: true},
    (err, updatedUser) => {
      if(!err) {
        let responseObj = {}
        responseObj['_id'] = updatedUser.id
        responseObj['username'] = updatedUser.username
        responseObj['date'] = new Date(newExercise.date).toDateString()
        responseObj['description'] = newExercise.description
        responseObj['duration'] = newExercise.duration
        res.json(responseObj)
      }
    }
  )
});


//get exercise log of given user and apply filtering
app.get('/api/exercise/log', (req, res) => {
  userModel.findById(req.query.userId, (err, result) => {
    if(!err) {
      let responseObj = result
      
      if(req.query.limit) {
        responseObj.log = responseObj.log.slice(0, req.query.limit)
      }
      
      if(req.query.from || req.query.to) {
        let fromDate = new Date(0)
        let toDate = new Date()

        if(req.query.from) {
          fromDate = new Date(req.query.from)
        }

        if(req.query.to) {
          toDate = new Date(req.query.to)
        }

        fromDate = fromDate.getTime()
        toDate = toDate.getTime()

        responseObj.log = responseObj.log.filter((exer) => {
          let exerDate = new Date(exer.date).getTime()

          return exerDate >= fromDate && exerDate <= toDate
        })
      }

      responseObj['count'] = result.log.length
      res.json(responseObj)
    }
  })
});


