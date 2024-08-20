import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'https';
import fs from 'fs';

const sslOptions = { key: fs.readFileSync('ssl/key.pem'), cert: fs.readFileSync('ssl/cert.pem') };

const app = express();
const server = createServer(sslOptions, app);
const io = new Server(server);

app.use(express.static('../client'));
app.use(express.static('../shared'));

io.on('connection', (socket) => {
  socket.emit('client:connected', socket.id);
  socket.on('disconnect', () => socket.emit('client:disconnected', socket.id));

  socket.on('channel:join', (channelId) => {
    socket.join(channelId);
    socket.broadcast.to(channelId).emit('channel:join', channelId, socket.id);

    // Emit static WAV on channel:audioStream
    
  });

  socket.on('channel:leave', (channelId) => {
    console.log(socket.id, 'leave', channelId);
    socket.broadcast.to(channelId).emit('channel:leave', channelId, socket.id);
  });

  socket.on('channel:audioStream', (channelId, stream) => {
    console.log('audioStream', channelId, stream);
    socket.broadcast.to(channelId).emit('channel:audioStream', channelId, stream);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
