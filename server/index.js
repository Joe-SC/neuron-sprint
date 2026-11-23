import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { networkInterfaces } from "node:os";
import { WebSocketServer } from "ws";
import QRCode from "qrcode";
import { Room } from "./room.js";

const PORT = process.env.PORT || 3000;
const ROOT = fileURLToPath(new URL("../public/", import.meta.url));

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  const path = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const filePath = join(ROOT, path);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

const wss = new WebSocketServer({ server });

const room = new Room();

wss.on("connection", (ws) => {
  room.addClient(ws);
});

function lanIPs() {
  const interfaces = networkInterfaces();
  const ips = [];
  for (const key of Object.keys(interfaces)) {
    for (const iface of interfaces[key]) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

server.listen(PORT, "0.0.0.0", async () => {
  console.log("\n  Neuron Sprint\n");
  const ips = lanIPs();
  for (const ip of ips) {
    const url = `http://${ip}:${PORT}`;
    console.log(`  ${url}`);
    try {
      const qr = await QRCode.toString(url, { type: "terminal", small: true });
      console.log(qr);
    } catch { /* QR not critical */ }
  }
  console.log(`\n  Open that URL on your phone or another device.\n`);
});