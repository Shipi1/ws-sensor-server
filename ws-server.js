const WebSocket = require("ws");
const https = require("https");
const fs = require("fs");

const serverConfig = {
  key: fs.readFileSync("/etc/letsencrypt/live/shipisnature.com/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/shipisnature.com/fullchain.pem"),
};

const httpsServer = https.createServer(serverConfig);

const wss = new WebSocket.Server({ server: httpsServer });
const clients = new Set();

function validate(msg) {
  if (
    (typeof msg.sensor_id !== "string" && typeof msg.sensor_id !== "number") ||
    msg.sensor_id === ""
  )
    return "invalid sensor_id";
  if (
    msg.temperature != null &&
    (typeof msg.temperature !== "number" || !isFinite(msg.temperature))
  )
    return "invalid temperature";
  if (
    msg.humidity != null &&
    (typeof msg.humidity !== "number" || !isFinite(msg.humidity))
  )
    return "invalid humidity";
  if (msg.co2 != null && (typeof msg.co2 !== "number" || !isFinite(msg.co2)))
    return "invalid co2";
  if (typeof msg.timestamp !== "number" || !isFinite(msg.timestamp))
    return "invalid timestamp";
  return null;
}

wss.on("connection", (ws) => {
  console.log(`[${new Date().toLocaleString()}] Client connected`);
  clients.add(ws);

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      ws.send(JSON.stringify({ error: "invalid JSON" }));
      return;
    }

    const err = validate(msg);
    if (err) {
      ws.send(JSON.stringify({ error: err }));
      return;
    }

    console.log(`[${new Date().toLocaleString()}] Received:`, JSON.stringify(msg));
    // Broadcast to all other connected clients
    clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(msg));
      }
    });
  });

  ws.on("close", () => {
    console.log(`[${new Date().toLocaleString()}] Client disconnected`);
    clients.delete(ws);
  });
});

httpsServer.listen(8443, () => {
  console.log("WebSocket Secure server running on port 8443");
});

const plainWss = new WebSocket.Server({ port: 8080 });
console.log("WebSocket server running on port 8080");
