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
  res.send({ msg: 'server check passed' });
});

router.post("/check-cache", function (req, res) {
  res.send(reqCache);
});

router.post("/verify", async function (req, res) {
  var email = req.headers['email'];
  var otp = req.headers['otp'];
  var auth = req.headers['authorization'];
  var auth_key = `${process.env.AUTH}`;
  if (auth != auth_key) {
    res.send({ msg: 'request not valid' });
  };
  try {
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
        res.send({ msg: 'email sent successfully.' });
      })
      .catch((error) => {
        res.send(error);
      })
  } catch (e) {
    console.error(e);
  }
});

router.post("/verify-sms", async function (req, res) {
  var phone = req.headers['phone'];
  var otp = req.headers['otp'];
  var auth = req.headers['authorization'];
  var auth_key = `${process.env.AUTH}`;
  if (auth != auth_key) {
    res.send({ msg: 'request not valid' });
  };
  try {
    const twilioSID = `${process.env.TWILIO_ACCOUNT_SID}`;
    const twilioAuthToken = `${process.env.TWILIO_AUTH_TOKEN}`;

    const client = new require('twilio')(twilioSID, twilioAuthToken);

    const sms_req = {
      body: 'Hello BOOM Gamer, here is your OTP : ' + otp + '. Do-Not share this with anyone.',
      from: '+16592254521',
      to: phone
    }
    client.messages
      .create(sms_req)
      .then(() => {
        res.send({ msg: 'sms sent successfully.' });
      })
      .catch((error) => {
        res.send(error);
      })
  } catch (e) {
    console.error(e);
  }
});

app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

module.exports = app;
module.exports.handler = serverless(app);
