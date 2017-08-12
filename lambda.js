'use strict';
const request = require('request');
/**
 * This sample demonstrates a simple skill built with the Amazon Alexa Skills Kit.
 * The Intent Schema, Custom Slots, and Sample Utterances for this skill, as well as
 * testing instructions are located at http://amzn.to/1LzFrj6
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */


// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `Bitcoin sentiment - ${title}`,
            content: `Bitcoin sentiment - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to the Bitcoin sentiment checker. ' +
        'I can tell you how many people were positive about future of bitcoin and how many was negative. How many days in the past would you like to check?';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'I can tell you how many people were positive about future of bitcoin and how many was negative. How many days in the past would you like to check? ';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function sayGoodbye(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Goodbye';
    const speechOutput = 'Thank you for using Bitcoin sentiment checker. Goodbye.';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = null;
    const shouldEndSession = true;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getDataFromAPI(startDayTimestamp) {
  return new Promise((resolve, reject) => {
    if (!startDayTimestamp)
      startDayTimestamp = 0;
    request('http://bitcoinsentiment.com/index.php?api=1&a=spj&s=btcusd&p=d&b=' + startDayTimestamp + '&e=9999999999999', function (error, response, body) {
    console.log('error:', error); // Print the error if one occurred
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.
    let dataFromApi = body;
    resolve(dataFromApi);
  })
});
}

function getSentiment(dataFromApi) {
  let data = {};
  let rawData;
  eval("rawData = " + dataFromApi);
  // calculate positive/neg/neutral percentage

  let allVoters = 0;
  let positiveVoters = 0;
  let neutralVoters = 0;
  let negativeVoters = 0;
  for (let i = 0; i < rawData.length; i++) {
    positiveVoters += rawData[i][1];
    neutralVoters += rawData[i][2];
    negativeVoters += rawData[i][3];
    allVoters += rawData[i][4];
  }

  // Testing mock of data object
  data.positivePercentage = Math.round(positiveVoters / allVoters * 100);
  data.negativePercentage = Math.round(neutralVoters / allVoters * 100);
  data.neutralPercentage = Math.round(negativeVoters / allVoters * 100);
  console.log(`Positive: ${data.positivePercentage}, Negative: ${data.negativePercentage}, Neutral: ${data.neutralPercentage}.`);

  return data;
}

function tellBitcoinSentiment(intent, session, callback) {
  const sessionAttributes = {};
  const cardTitle = 'Sentiment';
  let days = intent.slots.Days.value;
  console.log("Days requested: " + days);
  // read number of days from user input
  if (days)
    days = parseInt(days.replace(/[^0-9\.]/g, ''), 10);
  if (days) {
    let startDayTimestamp = Date.now() - (days*24*3600*1000);
    getDataFromAPI(startDayTimestamp).then((dataFromApi) => {
      let data = getSentiment(dataFromApi);
      const speechOutput = `Taking into account ${days} days,  ${data.positivePercentage} percent of responders was positive about Bitcoin. ${data.negativePercentage} percent was negative. ${data.neutralPercentage} percentage of people had not strong opinion. Thank you for using sentiment checker. Goodbye.`;
      const repromptText = 'I can tell you how many people were positive about future of bitcoin and how many was negative. How many days in the past would you like to check? ';
      const shouldEndSession = true;

      callback(sessionAttributes,
          buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    });
  } else {
      const speechOutput = "I'm not sure what your answer is. Let me ask you again. I can tell you how many people were positive about future of bitcoin and how many was negative. How many days in the past would you like to check?";
      const repromptText = 'I can tell you how many people were positive about future of bitcoin and how many was negative. How many days in the past would you like to check? ';
      const shouldEndSession = false;
      callback(sessionAttributes,
          buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
  }
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying the Alexa Skills Kit sample. Have a nice day!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}


// --------------- Events -----------------------

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'HowManyDays') {
        tellBitcoinSentiment(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        sayGoodbye(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {

        if (event.session.new) {
            // Set sesion starting point
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
