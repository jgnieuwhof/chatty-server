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

  const getRandomColor = () => {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  let state = {
    clients: []
  };

  wss.broadcast = (data, omit = null) => {
    wss.clients.forEach(client => {
      if ((!omit || omit !== client) && client.readyState === WebSocket.OPEN) {
        client.send(prepareMessage(data));
      }
    });
  };

  const updateClient = ({ id, update }) => {
    state.clients = state.clients.map(
      c => (c.id == id ? { ...c, ...update } : c)
    );
  };

  wss.on('connection', ws => {
    const id = uuid();
    state.clients = [
      ...state.clients,
      { id, name: 'Anonymous', color: getRandomColor() }
    ];
    const client = () => state.clients.find(c => c.id === id);

    console.log(`client "${client().id}" connected`);

    setTimeout(() => {
      ws.send(
        prepareMessage({ type: 'incomingClientInit', content: client() })
      );
      wss.broadcast({ type: 'incomingClients', content: state.clients });
    }, 500);

    ws.on('message', x => {
      const { type, content } = JSON.parse(x);
      switch (type) {
        case 'postMessage':
          wss.broadcast({ type: 'incomingMessage', id: uuid(), content });
          break;
        case 'postChangeUsername':
          const oldName = client().name;
          updateClient({ id, update: { name: content.name } });
          wss.broadcast({ type: 'incomingUpdateClient', content: client() });
          wss.broadcast({
            type: 'incomingNotification',
            id: uuid(),
            content: {
              userId: id,
              username: content.name,
              content: `${oldName} changed their username to ${content.name}`
            }
          });
          break;
        default:
          console.error(`Unrecognized message:\n"${x}"`);
          break;
      }
    });

    ws.on('close', () => {
      state.clients = state.clients.filter(x => x.id !== id);
      wss.broadcast({ type: 'incomingClients', content: state.clients });
      console.log(`client "${client.id}" disconnected`);
    });
  });
};

export default server;
