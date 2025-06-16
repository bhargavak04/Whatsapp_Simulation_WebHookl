const WebSocket = require('ws');
const axios = require('axios');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log("Client connected.");

  ws.on('message', async (msg) => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const wa_id = "918888888888"; // Simulated user
    const phone_number_id = "123456789";

    const messageId = `wamid.${Math.random().toString(36).substring(7)}`;
    
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "15550009999",
                  phone_number_id
                },
                contacts: [
                  {
                    profile: { name: "SimUser" },
                    wa_id
                  }
                ],
                messages: [
                  {
                    from: wa_id,
                    id: messageId,
                    timestamp: ts,
                    text: { body: msg.toString() },
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
    await axios.post('https://your-n8n/webhook/whatsapp-incoming', payload);

    // Simulate message delivery status update
    setTimeout(() => {
      const statusPayload = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "WHATSAPP_BUSINESS_ACCOUNT_ID",
            changes: [
              {
                field: "statuses",
                value: {
                  messaging_product: "whatsapp",
                  metadata: {
                    phone_number_id
                  },
                  statuses: [
                    {
                      id: messageId,
                      status: "sent",
                      timestamp: ts,
                      recipient_id: wa_id
                    }
                  ]
                }
              }
            ]
          }
        ]
      };

      axios.post('https://your-n8n/webhook/whatsapp-status', statusPayload);
    }, 2000);
  });
});
