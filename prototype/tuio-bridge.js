#!/usr/bin/env node
// TUIO UDP -> WebSocket relay for Lumatable's physical-table mode.
//
// reacTIVision broadcasts TUIO (OSC over UDP) on port 3333; browsers cannot
// open UDP sockets, so this forwards each datagram verbatim to any connected
// WebSocket client. The page parses the OSC itself.
//
// Usage:
//   npm install ws
//   node tuio-bridge.js [udpPort] [wsPort]     (defaults 3333, 8765)
// then open the prototype with  ?tuio=ws://localhost:8765

const dgram = require('dgram');
const { WebSocketServer } = require('ws');

const UDP_PORT = Number(process.argv[2]) || 3333;
const WS_PORT = Number(process.argv[3]) || 8765;

const wss = new WebSocketServer({ port: WS_PORT });
const udp = dgram.createSocket('udp4');

udp.on('message', msg => {
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
});
udp.bind(UDP_PORT, () => {
  console.log(`TUIO bridge: UDP :${UDP_PORT} -> ws://localhost:${WS_PORT}`);
});
