'use strict';
const sgMail = require('@sendgrid/mail')
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

let reqCache = {};

const upCache = async(key) => {
  reqCache[key] = (reqCache[key]) ? (reqCache[key] + 1) : 1;
};

router.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<h1>Hello, I am a Test Server.</h1>');
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
  var idempotentKey = req.headers['x-idempotency-key'];
  var auth_key = `${process.env.AUTH}`;
  if (auth != auth_key) {
    res.send({ msg: 'request not valid' });
  };
  if (reqCache[idempotentKey] >= 7) {
    try {
      const apiKey = `${process.env.SENDGRID_API_KEY}`;
      const fromAddress = `${process.env.SENDGRID_FROM_EMAIL}`;
      sgMail.setApiKey(apiKey)
      const msg = {
        to: email,
        from: fromAddress,
        subject: 'BOOM DAO email verification',
        text: 'OTP Verification',
        html: '<strong>Your BOOM DAO verification code is ' + otp + '. Do not share this with anyone.</strong>',
      }
      await sgMail
        .send(msg)
        .then(() => {
          reqCache[idempotentKey] = 0;
          res.send({ msg: 'email sent successfully.' });
        })
        .catch((error) => {
          res.send(error);
        })
    } catch (e) {
      console.error(e);
    }
  } else {
    await upCache(idempotentKey);
    res.send({ msg: 'email sent successfully.' });
  }
});

router.post("/verify-phone", async function (req, res) {
  var phone = req.headers['to'];
  var otp = req.headers['otp'];
  var key = req.headers['i-twilio-idempotency-token'];
  var auth = req.headers['authorization'];
  var auth_key = `${process.env.AUTH}`;
  if (auth != auth_key) {
    res.send({ msg: 'request not valid' });
  };
  const sid = `${process.env.TWILIO_ACCOUNT_SID}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const from = `${process.env.TWILIO_PHONE_NUMBER}`;
  const authToken = `${process.env.TWILIO_AUTH_TOKEN}`;

  const data = new URLSearchParams();
  data.append('To', phone);
  data.append('From', from);
  data.append('Body', "Your BOOM DAO verification code is " + otp + ". Do not share this with anyone.");
  const uniqueId = key;

  if (reqCache[key] == undefined) {
    try {
      let response = await axios.post(url, data, {
        auth: {
          username: sid,
          password: authToken,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'I-Twilio-Idempotency-Token': uniqueId,
        },
      });
      res.send({ msg: 'Message sent successfully' });
    } catch (e) {
      console.log(e);
      res.send({ msg: "Message not send" });
    }
  } else {
    res.send({ msg: 'Message sent successfully' });
  }
});

app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

module.exports = app;
module.exports.handler = serverless(app);
