// WebRTC communications

import { useSocket, useSocketEvent } from '@/lib/socket';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

export const useLocalStream = () => {
  const [stream, setStream] = useState<MediaStream | undefined>();
  const [error, setError] = useState<any>();
  const requestedRef = useRef(false);

  useEffect(() => {
    const handleUserInteraction = () => {
      if (requestedRef.current) return;
      requestedRef.current = true;

      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((mediaStream) => {
          setStream(mediaStream);
        })
        .catch((err) => {
          console.error('Error accessing microphone:', err);
          setError(err);
        })
        .finally(() => {
          // Clean up event listeners after obtaining the media stream
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('keydown', handleUserInteraction);
          clearInterval(interval);
        });
    };

    // Attach event listeners for user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    const interval = setInterval(handleUserInteraction, 1000);

    handleUserInteraction();

    // Cleanup function to remove event listeners on unmount
    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      clearInterval(interval);
    };
  }, []);

  return stream;
}

export const usePeerConnection = ({ streamCount }: { streamCount: number }) => {
  if (typeof RTCPeerConnection === 'undefined') {
    return {};
  }

  const socket = useSocket();

  const peerConnection = useMemo(() => new RTCPeerConnection(), []);
  const remoteStream = useMemo(() => new MediaStream(), []);
  const localStream = useLocalStream();

  const [connectionStatus, setConnectionStatus] = useState<RTCPeerConnection['connectionState']>('disconnected');
  const [remoteTracks, setRemoteTracks] = useState<Map<number, MediaStreamTrack>>(new Map());
  const [trackControls, setTrackControls] = useState<Map<number, { micGain: GainNode, audioContext: AudioContext, outputTrack: MediaStreamTrack }>>(new Map());

  const dataChannel = useMemo(() => peerConnection.createDataChannel('data', { negotiated: true, id: 0 }), [peerConnection]);

  useEffect(() => {
    peerConnection.ontrack = (event) => {
      const { track } = event;

      remoteStream.addTrack(track);

      // Create an audio element for this track
      const remoteAudio = new Audio();
      remoteAudio.srcObject = new MediaStream([track]);
      remoteAudio.play();

      // Match incoming tracks to the correct index
      const trackIndex = remoteStream.getTracks().length - 1;

      setRemoteTracks((tracks) => new Map(tracks.set(trackIndex, track)));
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc', { event: 'ice-candidate', data: event.candidate });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      setConnectionStatus(peerConnection.connectionState);
    };
  }, [peerConnection]);

  const webrtcCallback = useCallback(({ event, data }: any) => {
    switch (event) {
      case 'offer':
        if (!localStream) throw new Error('Local stream unavailable, user has not interacted with the page yet.');
        acceptOffer({ socket, localStream, peerConnection, remoteDescription: data, streamCount }).then((trackControls) => setTrackControls(trackControls));
        break;
      case 'answer':
        if (data) {
          peerConnection.setRemoteDescription(data);
        }
        break;
      case 'ice-candidate':
        if (data) {
          peerConnection.addIceCandidate(data);
        }
        break;
    }
  }, [peerConnection, localStream, socket]);

  useSocketEvent('webrtc', webrtcCallback);

  const createOfferFn = useCallback(() => {
    if (!localStream || !peerConnection || !socket) return;
    createOffer({ socket, localStream, peerConnection, streamCount }).then((trackControls) => setTrackControls(trackControls));
  }, [localStream, peerConnection, socket, streamCount]);

  return { peerConnection, connectionStatus, dataChannel, tracks: remoteTracks, trackControls, createOffer: createOfferFn };
}

export const useAudioMonitor = (tracks: Map<number, MediaStreamTrack> | undefined) => {
  const [audioMonitors, setAudioMonitors] = useState<Map<number, boolean>>(new Map());

  const audioContext = useMemo(() => typeof AudioContext !== 'undefined' ? new AudioContext() : undefined, [tracks]);

  if (!audioContext) {
    return audioMonitors;
  }

  const analysers = useMemo(() => {
    console.log('tracks useMemo', tracks);

    return Array.from(tracks?.values() ?? []).map((track) => {
      const source = audioContext.createMediaStreamSource(new MediaStream([track]));
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);

      return analyser;
    });
  }, [tracks, audioContext]);

  const dataArrays = useMemo(() => analysers.map((analyser) => new Uint8Array(analyser.frequencyBinCount)), [analysers]);

  useEffect(() => {
    const updateDataArrays = () => {
      analysers.forEach((analyser, i) => {
        const dataArray = dataArrays[i];
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;

        setAudioMonitors((monitors) => new Map(monitors.set(i, average > 10)));
      });
    };

    updateDataArrays();
    const interval = setInterval(updateDataArrays, 100);

    return () => {
      analysers.forEach((analyser) => analyser.disconnect());
      clearInterval(interval);
    };
  }, [analysers, dataArrays, tracks]);

  return audioMonitors;
}

const loadAudioBuffer = async (audioContext: AudioContext, url: string) => fetch(url)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer));

/**
 * Create an offer as the Experimenter.
 * @returns
 */
const createOffer = async ({ socket, localStream, peerConnection, streamCount }: { socket: Socket | undefined, localStream: MediaStream, peerConnection: RTCPeerConnection, streamCount: number }) => {
  // const trackControls = new Map<number, { micGain: GainNode, clipGain: GainNode, audioContext: AudioContext, clipBuffer: AudioBuffer, outputTrack: MediaStreamTrack }>();
  const trackControls = new Map<number, { micGain: GainNode, audioContext: AudioContext, outputTrack: MediaStreamTrack }>();

  // const localStream = await getLocalStream();
  const micTrack = localStream.getAudioTracks()[0];

  for (let i = 0; i < streamCount; i++) {
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    // Microphone source
    const micSource = audioContext.createMediaStreamSource(new MediaStream([micTrack]));

    // Mic GainNode
    const micGain = audioContext.createGain();
    micGain.gain.value = 0; // Initially muted

    // Connect mic to micGain
    micSource.connect(micGain);

    // Pre-recorded audio source
    // const clipBuffer = await loadAudioBuffer(audioContext, '/clips/clip1.wav');
    // const clipGain = audioContext.createGain();
    // clipGain.gain.value = 0; // Initially muted

    // Connect gains to destination
    micGain.connect(destination);
    // clipGain.connect(destination);

    // Create MediaStreamTrack from destination
    const outputStream = destination.stream;
    const outputTrack = outputStream.getAudioTracks()[0];

    // trackControls.set(i, { micGain, clipGain, audioContext, clipBuffer, outputTrack });
    trackControls.set(i, { micGain, audioContext, outputTrack });

    peerConnection.addTrack(outputTrack, outputStream);
  }

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket?.emit('webrtc', { event: 'offer', data: peerConnection.localDescription });

  return trackControls;
};

/**
 * Accept offer as the Participant.
 */
const acceptOffer = async ({ socket, localStream, peerConnection, remoteDescription, streamCount }: { socket: Socket | undefined, localStream: MediaStream, peerConnection: RTCPeerConnection, remoteDescription: RTCSessionDescriptionInit, streamCount: number }) => {
  const trackControls = new Map<number, { micGain: GainNode, audioContext: AudioContext, outputTrack: MediaStreamTrack }>();

  await peerConnection.setRemoteDescription(remoteDescription);

  // const localStream = await getLocalStream();
  const micTrack = localStream.getAudioTracks()[0];

  for (let i = 0; i < streamCount; i++) {
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    // Microphone source
    const micSource = audioContext.createMediaStreamSource(new MediaStream([micTrack]));

    // Mic GainNode
    const micGain = audioContext.createGain();
    micGain.gain.value = 0; // Initially muted

    // Connect mic to micGain
    micSource.connect(micGain);

    // Connect gains to destination
    micGain.connect(destination);

    // Create MediaStreamTrack from destination
    const outputStream = destination.stream;
    const outputTrack = outputStream.getAudioTracks()[0];

    trackControls.set(i, { micGain, audioContext, outputTrack });

    peerConnection.addTrack(outputTrack, outputStream);
  }

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket?.emit('webrtc', { event: 'answer', data: peerConnection.localDescription });

  return trackControls;
};
