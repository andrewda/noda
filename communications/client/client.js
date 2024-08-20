import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';
import config from './config.json' with { type: 'json' };

const channelId1 = document.getElementById('channelId1');
const channelId2 = document.getElementById('channelId2');
const channelId3 = document.getElementById('channelId3');

document.getElementById('joinChannel1').addEventListener('click', () => socket.emit('channel:join', channelId1.value));
document.getElementById('joinChannel2').addEventListener('click', () => socket.emit('channel:join', channelId2.value));
document.getElementById('joinChannel3').addEventListener('click', () => socket.emit('channel:join', channelId3.value));

const socket = io();

socket.on('connect', () => {
  console.log('connected', socket.id);

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      const mediaRecorder = new MediaRecorder(stream);
      let audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        // socket.emit('channel:audioStream', channelId1.value, e.data);
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks);
        audioChunks = [];

        const fileReader = new FileReader();
        fileReader.readAsDataURL(audioBlob);
        fileReader.onloadend = () => {
          socket.emit('channel:audioStream', '123.075', fileReader.result);
        };

        mediaRecorder.start();
        setTimeout(() => {
          mediaRecorder.stop();
        }, 1000);

      };

      mediaRecorder.start();
    })
    .catch((err) => {
      console.log('getUserMedia error', err);
    });
})

socket.on('channel:audioStream', (channelId, stream) => {
  console.log('audioStream', channelId, stream);

  const newData = `data:audio/ogg;${audioData.split(',')[1]}`;

  const audio = new Audio(newData);
  if (!audio || document.hidden) {
    return;
  }

  audio.play();
});
