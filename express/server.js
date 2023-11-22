'use strict';
const sgMail = require('@sendgrid/mail')
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');
require('dotenv').config();

const router = express.Router();
router.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<h1>Hello, Email Verifier!</h1>');
  res.end();
});

router.post("/post-check", function (req, res) {
  res.send({msg : 'server check passed'});
});

router.post("/verify", async function (req, res) {
  var email = req.headers['email'];
  var otp = req.headers['otp'];
  var auth = req.headers['authorization'];
  var auth_key = `${process.env.AUTH}`;
  if(auth != auth_key) {
    res.send({msg : 'request not valid'});
  };
  const apiKey = `${process.env.SENDGRID_API_KEY}`;
  sgMail.setApiKey(apiKey)
  const msg = {
    to: email,
    from: 'hiteshtripathi12345678@gmail.com',
    subject: 'OTP for BOOM DAO OG Member Verification',
    text: 'OTP Verification',
    html: '<strong>Hello ' + email + ', Here is your OTP : ' + otp + ' for verification. Do not share this with anyone.</strong>',
  }
  await sgMail
    .send(msg)
    .then(() => {
      res.send({msg : 'email sent successfully.'});
    })
    .catch((error) => {
      console.error(error);
      res.send(error);
    })
});

app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

module.exports = app;
module.exports.handler = serverless(app);
