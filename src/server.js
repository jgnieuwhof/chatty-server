import express from 'express';
import WebSocket, { Server } from 'ws';
import uuid from 'uuid/v4';

const server = () => {
  const PORT = 3001;

  const server = express().listen(PORT, '0.0.0.0', 'localhost', () =>
    console.log(`listening on ${PORT}`)
  );

  const wss = new Server({ server });

  const prepareMessage = msg => JSON.stringify(msg);

  wss.broadcast = (data, omit = null) => {
    wss.clients.forEach(client => {
      if ((!omit || omit !== client) && client.readyState === WebSocket.OPEN) {
        client.send(prepareMessage(data));
      }
    });
  };

  wss.on('connection', ws => {
    console.log('client connected');
    ws.on('message', x => {
      const id = uuid();
      const { type, content } = JSON.parse(x);
      console.log({ type, content });
      switch (type) {
        case 'postMessage':
          wss.broadcast({ type: 'incomingMessage', id, content });
          break;
        case 'postNotification':
          wss.broadcast({ type: 'incomingNotification', id, content });
          break;
        default:
          console.error(`Unrecognized message:\n"${x}"`);
          break;
      }
    });
    ws.on('close', () => console.log('client disconnected'));
  });
};

export default server;
