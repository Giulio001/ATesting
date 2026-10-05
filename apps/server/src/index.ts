import { createServer } from 'node:http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { LumengateRoom } from './rooms/LumengateRoom.ts';

const port = Number(process.env.PORT ?? 2588);
const http = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', project: 'aetheria-3d', room: 'lumengate' }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});
const server = new Server({
  transport: new WebSocketTransport({ server: http, maxPayload: 4096 }),
});
server.define('lumengate', LumengateRoom);
await server.listen(port, process.env.HOST ?? '127.0.0.1');
console.log(`Aetheria 3D · multiplayer http://127.0.0.1:${port} · isolated from Aetheria 2D`);
