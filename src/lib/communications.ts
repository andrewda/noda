// WebRTC communications

import { useSocket, useSocketEvent } from '@/lib/socket';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import * as Tone from 'tone';

import { polarDegToXyz } from './spatial';

const polarPositions: [number, number, number][] = [
  [-110, -60, 3],
  [-20, -60, 3],
  [20, -60, 3],
  [110, -60, 3],

  [-110, 60, 3],
  [-20, 60, 3],
  [20, 60, 3],
  [110, 60, 3],
];

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
          Tone.start().then(() => console.log('Tone started'));
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
  const socket = useSocket();

  const peerConnection = useMemo(() => typeof RTCPeerConnection === 'undefined' ? undefined : new RTCPeerConnection(), []);
  const remoteStream = useMemo(() => typeof MediaStream === 'undefined' ? undefined : new MediaStream(), []);
  const localStream = useLocalStream();

  const [connectionStatus, setConnectionStatus] = useState<RTCPeerConnection['connectionState']>('disconnected');
  const [remoteTracks, setRemoteTracks] = useState<Map<number, MediaStreamTrack>>(new Map());
  const [trackControls, setTrackControls] = useState<Map<number, { micGain: GainNode, audioContext: AudioContext, outputTrack: MediaStreamTrack }>>(new Map());

  const dataChannel = useMemo(() => peerConnection?.createDataChannel('data', { negotiated: true, id: 0 }), [peerConnection]);

  useEffect(() => {
    if (!peerConnection) return;

    const audioContext = new AudioContext();

    peerConnection.ontrack = async (event) => {
      const { track } = event;

      await audioContext.resume();

      // If we are receiving more than the expected number of tracks, assume there's been a disconnection and reset
      if ((remoteStream?.getTracks().length ?? 0) >= streamCount) {
        remoteStream?.getTracks().forEach((track) => remoteStream?.removeTrack(track));
      }

      remoteStream?.addTrack(track);

      // Match incoming tracks to the correct index
      const trackIndex = (remoteStream?.getTracks().length ?? 0) - 1;

      const mediaStream = new MediaStream([track]);

      // Fixes audio rendering on Chrome: https://issues.chromium.org/issues/40184923#comment128
      const audioElement = new Audio();
      audioElement.muted = true;
      audioElement.srcObject = mediaStream;

      const mediaStreamSource = Tone.getContext().createMediaStreamSource(mediaStream);
      const gainNode = new Tone.Gain(1.0);
      Tone.connect(mediaStreamSource, gainNode);

      const distortion = new Tone.Distortion(0.1);

      const highpass = new Tone.Filter({
        type: 'highpass',
        frequency: 300,
        rolloff: -48,
      });

      const lowpass = new Tone.Filter({
        type: 'lowpass',
        frequency: 2700,
        rolloff: -48,
      });

      const noise = new Tone.Noise('pink').start();
      const noiseGain = new Tone.Gain(0.02);
      noise.connect(noiseGain);

      const follower = new Tone.Follower(0.1);
      gainNode.connect(follower);

      const threshold = new Tone.GreaterThan(0.001); // Adjust the threshold as needed
      follower.connect(threshold);

      // Multiply the threshold output to scale the gain
      const scaler = new Tone.Multiply(0.05);
      threshold.connect(scaler);

      // Use the scaler output to control the gain of the noiseGain node
      scaler.connect(noiseGain.gain);

      noiseGain.connect(highpass);
      gainNode.connect(distortion).connect(highpass)
      highpass.connect(lowpass);

      const position = polarDegToXyz(...polarPositions[trackIndex]);
      const panner = new Tone.Panner3D({
        panningModel: 'HRTF',
        rolloffFactor: 1,
        ...position,
      });

      // Only use distorted audio for participant
      const audioNode = window.location.pathname === '/' ? lowpass : gainNode;

      audioNode.connect(new Tone.Gain(3.0)).connect(panner);
      panner.toDestination();

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
  }, [socket, remoteStream, peerConnection]);

  const webrtcCallback = useCallback(({ event, data }: any) => {
    if (!peerConnection) return;

    switch (event) {
      case 'offer':
        if (!localStream) throw new Error('Local stream unavailable, user has not interacted with the page yet.');
        // @ts-ignore
        acceptOffer({ socket, localStream, peerConnection, remoteDescription: data, streamCount }).then((trackControls) => setTrackControls(trackControls));
        break;
      case 'answer':
        if (data) {
          if (peerConnection.signalingState === 'stable') return;
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

  const analysers = useMemo(() => {
    return Array.from(tracks?.values() ?? []).map((track) => {
      const source = audioContext?.createMediaStreamSource(new MediaStream([track]));
      const analyser = audioContext?.createAnalyser();

      if (!source || !analyser) return;

      source.connect(analyser);

      return analyser;
    });
  }, [tracks, audioContext]);

  const dataArrays = useMemo(() => analysers.map((analyser) => new Uint8Array(analyser?.frequencyBinCount ?? 0)), [analysers]);

  useEffect(() => {
    const updateDataArrays = () => {
      analysers.forEach((analyser, i) => {
        const dataArray = dataArrays[i];
        analyser?.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;

        setAudioMonitors((monitors) => new Map(monitors.set(i, average > 2)));
      });
    };

    updateDataArrays();
    const interval = setInterval(updateDataArrays, 100);

    return () => {
      analysers.forEach((analyser) => analyser?.disconnect());
      clearInterval(interval);
    };
  }, [analysers, dataArrays, tracks]);

  return audioMonitors;
}

const loadAudioBuffer = async (audioContext: AudioContext, url: string) => fetch(url)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer));

const createAudioStream = (micTrack: MediaStreamTrack, audioClip?: string, applyEffects?: boolean) => {
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

  return { audioContext, micGain, outputStream, outputTrack, destination };
}

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
    const { audioContext, micGain, outputStream, outputTrack } = createAudioStream(micTrack);

    // trackControls.set(i, { micGain, clipGain, audioContext, clipBuffer, outputTrack });
    trackControls.set(i, { micGain, audioContext, outputTrack });
    peerConnection.addTrack(outputTrack, outputStream);
  }

  const offer = await peerConnection.createOffer();
  offer.sdp = offer.sdp?.replace('useinbandfec=1', 'useinbandfec=1;usedtx=1;stereo=0;maxaveragebitrate=510000');

  await peerConnection.setLocalDescription(offer);
  socket?.emit('webrtc', { event: 'offer', data: peerConnection.localDescription });

  return trackControls;
};

/**
 * Accept offer as the Participant.
 */
const acceptOffer = async ({ socket, localStream, peerConnection, remoteDescription, streamCount }: { socket: Socket | undefined, localStream: MediaStream, peerConnection: RTCPeerConnection, remoteDescription: RTCSessionDescriptionInit, streamCount: number }) => {
  const trackControls = new Map<number, { micGain: GainNode, audioContext: AudioContext, outputTrack: MediaStreamTrack }>();

  if (peerConnection.signalingState !== 'stable') return;

  await peerConnection.setRemoteDescription(remoteDescription);

  // const localStream = await getLocalStream();
  const micTrack = localStream.getAudioTracks()[0];

  for (let i = 0; i < streamCount; i++) {
    const { audioContext, micGain, outputStream, outputTrack } = createAudioStream(micTrack);

    trackControls.set(i, { micGain, audioContext, outputTrack });
    peerConnection.addTrack(outputTrack, outputStream);
  }

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket?.emit('webrtc', { event: 'answer', data: peerConnection.localDescription });

  return trackControls;
};
