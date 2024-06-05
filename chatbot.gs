const scriptProperties = PropertiesService.getScriptProperties();
const botToken = scriptProperties.getProperty('botToken');
const API_URL = `https://api.telegram.org/bot${botToken}/`;

function setWebhook() {
  var url = 'https://script.google.com/macros/s/AKfycbx9lxBpVvBIkHxgf0g2YleSGeiRb6eYP0sW8dy5mqSHx_OgkXPqXp-Pd-ZmEA4gNxWp/exec'; // Replace with your Web App URL
  var response = UrlFetchApp.fetch(API_URL + 'setWebhook?url=' + url);
  Logger.log(response.getContentText());
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var message = data.message;
  var chatId = message.chat.id;

  if (message.text == "/start") {
    welcomeMessage(chatId);
  } else {
    handleUserMessage(chatId, message.text);
  }
}

function welcomeMessage(chatId) {
  sendMessage(chatId, "Hello, I'm a chatbot created by [Nath](https://m.me/nthnlgmz) using Groq API. How can I help you today?");
}

function handleUserMessage(chatId, text) {
  var previousInteractions = getAllInteractions(chatId);
  var context = '';
  
  // Concatenate all previous questions and responses to create context
  previousInteractions.forEach(interaction => {
    context += interaction.question + ' ' + interaction.response + ' ';
  });
  
  // Use the context along with the current message
  var response = callGroqAPI(context + text);

  // Save the current interaction
  saveInteraction(chatId, text, response);
  sendMessage(chatId, response);
}

function getAllInteractions(chatId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var interactions = [];
  
  for (var i = 2; i <= lastRow; i++) {
    var rowChatId = sheet.getRange(i, 2).getValue();
    
    if (rowChatId == chatId) {
      var question = sheet.getRange(i, 3).getValue();
      var response = sheet.getRange(i, 4).getValue();
      interactions.push({ question: question, response: response });
    }
  }
  
  return interactions;
}

function sendMessage(chatId, text) {
  var payload = {
    method: 'sendMessage',
    chat_id: String(chatId),
    text: text,
    parse_mode: 'Markdown' 
  };
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  try {
    UrlFetchApp.fetch(API_URL + 'sendMessage', options);
  } catch (e) {
    Logger.log('Error sending message: ' + e.toString());
  }
}

function callGroqAPI(message) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const apiKey = scriptProperties.getProperty('apiKey');

  if (!apiKey) {
    return "Error: API key not set in script properties.";
  }

  const headers = {
    "Authorization": "Bearer " + apiKey,
    "Content-Type": "application/json"
  };

  const payload = JSON.stringify({
    "model": "llama3-70b-8192",
    "messages": [
      {
        "role": "user",
        "content": message
      }
    ],
    "temperature": 0,
    "max_tokens": 8192
  });

  const options = {
    "method": "post",
    "headers": headers,
    "payload": payload,
    "muteHttpExceptions": true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const jsonResponse = response.getContentText();
    const parsedResponse = JSON.parse(jsonResponse);
    if (parsedResponse.choices && parsedResponse.choices.length > 0) {
      const content = parsedResponse.choices[0].message.content.trim();
      return content;
    } else {
      return "Error: No response from Groq API.";
    }
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function saveInteraction(chatId, question, response) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([new Date(), chatId, question, response]);
}
