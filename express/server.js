'use strict';
const sgMail = require('@sendgrid/mail')
const express = require('express');
const path = require('path');
const serverless = require('serverless-http');
const app = express();
const bodyParser = require('body-parser');
require('dotenv').config();

const router = express.Router();
let reqCache = {};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function checkIfResultCached(req, res) {
  if (reqCache[req.get("x-idempotence-key") + "hasStarted"] != null) {
    let waitingForResult = true;
    while (waitingForResult) {
      let cachedSuccess = reqCache[req.get("x-idempotence-key") + "success"];
      let cachedError = reqCache[req.get("x-idempotence-key") + "error"];
      if (cachedSuccess != null) {
        waitingForResult = false;
        res.send(cachedSuccess);
        return true;
      } else if (cachedError != null) {
        waitingForResult = false;
        return true;
      }
      // await sleep(1000);
      function sleep(ms) {
        return new Promise((resolve) => {
          setTimeout(resolve, ms);
        });
      }
    }
    return true;
  } else {
    reqCache[req.get("x-idempotence-key") + "hasStarted"] = "started";
    return false;
  }
}

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
    if (await checkIfResultCached(req, res)) {
      return;
    }
    const apiKey = `${process.env.SENDGRID_API_KEY}`;
    sgMail.setApiKey(apiKey)
    const msg = {
      to: email,
      from: 'hiteshtripathi12345678@gmail.com',
      subject: 'OTP for BOOM DAO OG Member Verification',
      text: 'OTP Verification',
      html: '<strong>Hello ' + email + ', Here is your OTP : ' + otp + ' for verification. Do not share this with anyone.</strong>',
    }
    reqCache[req.get("x-idempotence-key") + "success"] = true;
    await sgMail
      .send(msg)
      .then(() => {
        res.send({ msg: 'email sent successfully.' });
      })
      .catch((error) => {
        res.send(error);
      })
  } catch (e) {
    reqCache[req.get("x-idempotence-key") + "error"] = e; //store the error in the cache
    console.error(e);
  }
});

app.use(bodyParser.json());
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(__dirname, '../index.html')));

module.exports = app;
module.exports.handler = serverless(app);
