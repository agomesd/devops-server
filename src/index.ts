import { createServer } from "http";
import { WebSocketServer } from "ws";
import { config } from "dotenv";
import { URL } from "url";
import { buildEnpointString, getRegion, validateRegion } from "./utils";
import { SUPPORTED_REGIONS } from "./consts";

config(); //Configure environment variables
const server = createServer();
const ws = new WebSocketServer({ noServer: true });
const SERVICE_HOST = process.env.SERVICE_HOST;
const PORT = process.env.PORT || 8081;
const DELAY = 5_000;

ws.on("connection", (socket, request) => {
  if (!SERVICE_HOST) {
    shutdown("Service host not provided");
    return;
  }
  if (!request.url) return;
  const region = getRegion(request.url);
  const endpoint = buildEnpointString(region, SERVICE_HOST);
  const interval = setInterval(async () => {
    const data = await getData(endpoint);
    if (!data) {
      socket.send(`Error fetching data - trying again`);
      return;
    }
    socket.send(JSON.stringify(data));
  }, DELAY);

  socket.onmessage = (message) => {
    console.log("Message received: ", message.data);
  };

  socket.onerror = (err) => {
    console.error("Socket error: ", err);
  };

  socket.onclose = () => {
    clearInterval(interval);
    console.log("Socket closed");
  };
});

server.on("upgrade", (request, socket, head) => {
  if (!request.url) return;
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);
  const region = getRegion(pathname);
  if (!validateRegion(region)) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }
  for (const supRegion of SUPPORTED_REGIONS) {
    if (supRegion === region) {
      ws.handleUpgrade(request, socket, head, (socket) => {
        ws.emit("connection", socket, request);
      });
      break;
    }
  }
});

server.on("request", (req, res) => {
  if (!req.url) {
    res.end("Invalid request");
    return;
  }

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, GET",
    "Access-Control-Max-Age": 2592000, // 30 days
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method === "GET") {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    switch (pathname) {
      case "/": {
        res.writeHead(200, { "Content-Type": "text/plain", ...headers });
        res.end("Welcome to the server");
        return;
      }
      case "/regions": {
        res.writeHead(200, { "Content-Type": "application/json", ...headers });
        res.end(JSON.stringify(SUPPORTED_REGIONS));
        return;
      }
      default: {
        res.writeHead(404, { "Content-Type": "text/plain", ...headers });
        res.end("Not found");
        return;
      }
    }
  }

  res.writeHead(405, { "Content-Type": "text/plain", ...headers });
  res.end(`${req.method} is not allowed for the request.`);
});

server.listen(PORT, () => {
  if (!SERVICE_HOST) shutdown("Service host not provided");
  console.log(`Server running on port ${PORT}`);
});

function shutdown(message?: string) {
  server.close(() => {
    console.log("Server closed: ", message ?? "No message");
    process.exit(0);
  });
}

async function getData(url: string) {
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      console.error("Error fetching data: ", res.statusText);
      return null;
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching data: ", error);
    return null;
  }
}
