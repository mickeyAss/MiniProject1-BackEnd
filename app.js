var express = require('express');
var app = express();
const userRouter =  require('./api/user');
const numberLototRouter =  require('./api/number_lotto');
const cors = require('cors');
var bodyParser = require('body-parser')

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.text());

app.use("/user",userRouter);
app.use("/number_lotto",numberLototRouter);
app.use("/",userRouter);


module.exports = app;