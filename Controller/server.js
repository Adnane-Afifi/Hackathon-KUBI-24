"use strict";

//----------------Required modules----------------------
const express = require('express');
const mustache = require('mustache-express');
var cors = require('cors');
const bodyParser = require('body-parser');

//----------------Configuration of the server ----------------------
var app = express();
const port = process.env.PORT||4000;
app.use(express.static('../CSS'));
app.use(express.static('../public'));
app.engine('html', mustache());
app.set('view engine', 'html');
app.set('views', '../Views');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());


//----------------Routes of the server -----------------------
app.get("/", (req, res) => {

res.render("homepage")
});





//----------------END-------------------------------------------->
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
  