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

router.get('/', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.write('<h1>Hello, I am a Test Server.</h1>');
  res.end();
});

router.post("/post-check", function (req, res) {
  res.send({ msg: 'server check passed' });
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
    },
  };

  let response = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotentKey,
      'Accept': 'application/json',
      'Authorization': courier_auth_token,
    },
  });
  res.send({ msg: "email sent" });

});

router.post("/verify-phone-courier", async function (req, res) {
  var phone = req.headers['phone'];
  var otp = req.headers['otp'];
  var auth = req.headers['authorization'];
  var idempotentKey = req.headers['x-idempotency-key'];
  var auth_key = `${process.env.AUTH}`;
  var courier_auth_token = `${process.env.COURIER_EMAIL_AUTH}`;
  var template_id = `${process.env.COURIER_TEMPLATE_ID}`;
  var brand_id = `${process.env.COURIER_BRAND_ID}`;
  if (auth != auth_key) {
    res.send({ msg: 'request not valid' });
  };
  let url = "https://api.courier.com/send";
  console.log(phone);
  console.log(idempotentKey);
  let body = {
    "message": {
      "brand_id": brand_id,
      "template": template_id,
      "to": {
        "phone_number": phone
      },
      "data": {
        "otp": otp
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
  console.log(response);
  res.send({ msg: "sms sent" });

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
});

app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

module.exports = app;
module.exports.handler = serverless(app);
