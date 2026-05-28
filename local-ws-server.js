const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });
const clients = new Set();

console.log("WebSocket server running on ws://localhost:8080");

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
