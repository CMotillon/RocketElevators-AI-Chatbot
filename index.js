// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const axios = require('axios');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    return axios.all([
      axios.get('https://rocket-elevators-cm.azurewebsites.net/api/Elevators'),
      axios.get('https://rocket-elevators-cm.azurewebsites.net/api/Buildings'),
      axios.get('https://rocket-elevators-cm.azurewebsites.net/api/Buildings/Customers'),
      axios.get('https://rocket-elevators-cm.azurewebsites.net/api/Buildings/Quotes'),
      axios.get('https://rocket-elevators-cm.azurewebsites.net/api/Batteries'),
      axios.get('https://rocket-elevators-cm.azurewebsites.net/api/Elevators/statuscheck'),
      axios.get('https://rocket-elevators-cm.azurewebsites.net/api/Buildings/Cities')
      
    ]).then(responseArr => {
      const nb_elevators = responseArr[0].data.length;
      const nb_buildings = responseArr[1].data.length;
      const nb_customers = responseArr[2].data.length;
      const nb_quotes = responseArr[3].data.length;
      const nb_batteries = responseArr[4].data.length;
      const nb_bad_elevators = responseArr[5].data.length;
      const nb_cities = responseArr[6].data.length;

      agent.add(`Greetings. 
        There are currently ${nb_elevators} deployed in the ${nb_buildings} buildings of your ${nb_customers} customers.\n
        Currently, ${nb_bad_elevators} elevators are not in Running Status and are being serviced. \n
        ${nb_batteries} Batteries are deployed across ${nb_cities} cities. \n
        On another note you currently have ${nb_quotes} quotes awaiting processing.`);
    });
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  
  function status(agent) {
    const id = agent.parameters.id;
    var controller = agent.parameters.controller;
    var product = controller;
    switch(controller){
      case "elevator":
        controller = "elevators";
        break;
      case "battery":
        controller = "batteries";
        break;
      case "column":
        controller = "columns";
        break;
      default:
        controller = "elevators";
    }
    const url = "https://rocket-elevators-cm.azurewebsites.net/api/" + controller + "/" + id;
    return axios.get(url).then(response => {
      agent.add(`The ${product} ${id} is ${response.data.status}`);
  	});
  }

  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('Status Intent', status);
  
  agent.handleRequest(intentMap);
});
