import http from 'http'
import https from 'https'
import { Server as SocketServer } from 'socket.io'
import express from 'express'
import fs from 'fs'

const credentials = { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') }

const app = express()
const httpsServer = https.createServer(credentials, app)
// const httpsServer = http.createServer(app)
const io = new SocketServer(httpsServer, { cors: { origin: '*' } })

app.use(express.static('.'))

// rtc signaling server
io.on('connect', socket => {

  console.log('socket connected', socket.id)

  socket.broadcast.emit('user:join', socket.id)

  socket.on('user:rtc:offer', ({ id, offer }) => {
    io.to(id).emit('user:rtc:offer', { id: socket.id, offer })
  })

  socket.on('user:rtc:answer', ({ id, answer }) => {
    io.to(id).emit('user:rtc:answer', { id: socket.id, answer })
  })

  socket.on('user:rtc:candidate', ({ id, candidate }) => {
    io.to(id).emit('user:rtc:candidate', { id: socket.id, candidate })
  })

  socket.on('disconnect', () => {
    socket.broadcast.emit('user:leave', socket.id)
  })
})

console.log('listening on port 8443')

// listen on 0.0.0.0:8443
// httpsServer.listen(8443, '0.0.0.0')
httpsServer.listen(8443, '0.0.0.0')
