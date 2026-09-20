import 'dotenv/config';
import http from 'node:http';
import { app } from './app.js';
import { initSocket } from './realtime/socket.js';

const port = process.env.PORT || 4000;
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Sajilo Bazar API listening on port ${port}`);
});
