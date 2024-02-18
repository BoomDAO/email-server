'use strict';
const sgMail = require('@sendgrid/mail')
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');
const axios = require('axios');
const courier = require('@trycourier/courier');
require('dotenv').config();

const router = express.Router();

let reqCache = {};
let success = {};

const upCache = async (key) => {
  reqCache[key] += 1;
};

const initCache = async (key) => {
  reqCache[key] = 0;
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

router.post("/init-cache", async function (req, res) {
  var auth = req.headers['authorization'];
  var idempotentKey = req.headers['x-idempotency-key'];
  var auth_key = `${process.env.AUTH}`;
  if (auth != auth_key) {
    res.send({ msg: 'request not valid' });
  };
  await initCache(idempotentKey);
  res.send({ msg: '' });
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
  // if (reqCache[idempotentKey] >= 12) {
  //   try {
  //     const apiKey = `${process.env.SENDGRID_API_KEY}`;
  //     const fromAddress = `${process.env.SENDGRID_FROM_EMAIL}`;
  //     sgMail.setApiKey(apiKey)
  //     const msg = {
  //       to: email,
  //       from: fromAddress,
  //       subject: 'BOOM DAO email verification',
  //       text: 'OTP Verification',
  //       html: '<strong>Your BOOM DAO verification code is ' + otp + '. Do not share this with anyone.</strong>',
  //     }
  //     await sgMail
  //       .send(msg)
  //       .then(() => {
  //         // reqCache[idempotentKey] = 0;
  //         success[idempotentKey] = true;
  //         res.send({ msg: 'email sent successfully.' });
  //       })
  //       .catch((error) => {
  //         res.send(error);
  //       })
  //   } catch (e) {
  //     console.error(e);
  //   }
  // } else {
  await upCache(idempotentKey);
  res.send({ msg: 'email sent successfully.' });
  // }
});

router.post("/verify-email-courier", async function (req, res) {
  var email = req.headers['email'];
  var otp = req.headers['otp'];
  var auth = req.headers['authorization'];
  var idempotentKey = req.headers['x-idempotency-key'];
  var auth_key = `${process.env.AUTH}`;
  var courier_auth_token = `${process.env.COURIER_EMAIL_AUTH}`
  if (auth != auth_key) {
    res.send({ msg: 'request not valid' });
  };
  let url = "https://api.courier.com/send";
  let body = {
    "message": {
      "to": {
        "email": email
      },
      "content": {
        "title": "BOOM DAO email verification",
        "body": 'Your BOOM DAO verification code is ' + otp + '. Do not share this with anyone.'
      }
    }
  };

  let response = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotentKey,
      'Accept': 'application/json',
      'Authorization': courier_auth_token,
    },
  });
  res.send({msg : "email sent"});

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
