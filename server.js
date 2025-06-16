const express = require('express');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

let clients = [];

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  clients.push(ws);

  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    console.log('Client disconnected');
  });
});

function sendToAllClients(eventType, payload) {
  const data = JSON.stringify({ event: eventType, ...payload });
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

app.post('/simulate-message', async (req, res) => {
  const messageBody = req.body.message || "Hello!";
  const from = req.body.from || "918888888888";
  const name = req.body.name || "User Sim";
  const messageId = `wamid.simulated.${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Step 1: Send "message" event
  const messagePayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA_ID",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15550009999",
                phone_number_id: "123456789"
              },
              contacts: [
                {
                  profile: { name },
                  wa_id: from
                }
              ],
              messages: [
                {
                  from,
                  id: messageId,
                  timestamp,
                  text: { body: messageBody },
                  type: "text"
                }
              ]
            }
          }
        ]
      }
    ]
  };

  // Send to n8n webhook
  try {
    const webhookUrl = 'https://bhargavint.app.n8n.cloud/webhook/whatsapp-incoming';
    const response = await axios.post(webhookUrl, messagePayload);
    const reply = response.data?.reply || "Thanks for your message!";

    // Simulate status updates (sequential with delays)
    sendToAllClients("message_sent", { messageId, from, timestamp });
    setTimeout(() => sendToAllClients("message_delivered", { messageId, from, timestamp }), 1000);
    setTimeout(() => sendToAllClients("message_read", { messageId, from, timestamp }), 2000);

    // Simulate reply after a short delay
    const replyId = `reply.sim.${Date.now()}`;
    const replyTs = Math.floor((Date.now() + 3000) / 1000).toString();

    setTimeout(() => {
      sendToAllClients("message", {
        from: "15550009999",
        to: from,
        messageId: replyId,
        timestamp: replyTs,
        text: reply
      });
    }, 3000);

    res.json({ status: "ok", messageId });
  } catch (err) {
    console.error("n8n webhook error:", err.message);
    res.status(500).json({ error: "Failed to post to n8n" });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
