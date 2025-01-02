import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });
const users = []

wss.on('connection', (ws) => {
    const userId = Date.now(); // Generate a unique ID for the user
    users.push(ws)

    console.log(`User connected: ${userId}`);

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            console.log("Message received:", msg);

            // Broadcast to specific users if needed
            switch (msg.type) {
                case 'getRtp':
                case 'rtp':
                case 'createTransport':
                case 'transportCreated':
                case 'connectTransport':
                case 'produce':
                    users.forEach((user) => {
                        user.send(JSON.stringify(msg));

                    })
                    break;
                default:
                    console.error("Unhandled message type:", msg.type);
            }
        } catch (error) {
            console.error("Error handling message:", error);
        }
    });

    ws.on('close', () => {
        console.log(`User disconnected: ${userId}`);
    });

    ws.on('error', (error) => {
        console.error(`Error from user ${userId}:`, error);
    });
});
