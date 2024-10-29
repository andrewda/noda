import C2Panel from '@/components/C2Panel'
import RadioPanel, { RadioCommunicationBoard } from '@/components/RadioPanel'
import TimelinePanel from '@/components/TimelinePanel'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { Pane, ResizablePanes } from 'resizable-panes-react'

import { useSimulation } from '@/hooks/use-simulation'
import { useSocket, useSocketEvent } from '@/lib/socket'
import { useAudioMonitor, usePeerConnection } from '@/lib/communications'

const MapPanel = dynamic(
  () => import('../components/MapPanel'),
  { ssr: false }
);

type LatLonTuple = [number, number];

function radiosReducer(state: Record<string, RadioCommunicationBoard>, action: any) {
  switch (action.type) {
    case 'add':
      return { ...state, [action.payload.id]: action.payload };
    case 'update':
      return { ...state, [action.payload.id]: action.payload };
    case 'remove':
      return Object.fromEntries(Object.entries(state).filter(([id]) => id !== action.payload));
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

const makeRadio = (id: string) => ({
  id,
  aircraft: undefined,
  facility: 'KPDX TWR',
  frequency: '123.450',
  receiving: false,
  monitoring: true,
  transmitting: false,
} as RadioCommunicationBoard)

export default function Home() {
  const socket = useSocket();
  const { aircraft, weather } = useSimulation();
  const [radios, setRadios] = useState<Record<string, RadioCommunicationBoard>>(Object.fromEntries(Array.from(Array(8).keys()).map((i) => [i.toString(), makeRadio(i.toString())])));

  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected'>(socket?.connected ? 'connected' : 'disconnected');
  const [selectedAircraftCallsign, setSelectedAircraftCallsign] = useState<string | undefined>(undefined);

  useSocketEvent('connect', () => setConnectionState('connected'));
  useSocketEvent('disconnect', () => setConnectionState('disconnected'));

  const { peerConnection, connectionStatus, dataChannel, tracks, trackControls, createOffer } = usePeerConnection({ streamCount: 8 });
  const localTracks = useMemo(() => new Map(Array.from(trackControls?.entries() ?? []).map(([i, { outputTrack }]) => [i, outputTrack])), [trackControls]);

  const remoteAudioMonitors = useAudioMonitor(tracks);
  const localAudioMonitors = useAudioMonitor(localTracks);

  useEffect(() => {
    setRadios((radios) => Object.fromEntries(Object.entries(radios).map(([id, radio], idx) => ([id, {
      ...radio,
      aircraft: Object.keys(aircraft)[idx],
      receiving: remoteAudioMonitors.get(idx) ?? false,
    }]))));
  }, [aircraft, remoteAudioMonitors, localAudioMonitors]);

  const onMonitoringChange = useCallback((radioIdx: number, monitoring: boolean) => {
    setRadios((radios) => Object.fromEntries(Object.entries(radios).map(([id, radio], idx) => ([id, { ...radio, monitoring: (idx === radioIdx ? monitoring : radio.monitoring) }]))));
  }, [trackControls]);

  const onTransmittingChange = useCallback((radioIdx: number, transmitting: boolean) => {
    setRadios((radios) => Object.fromEntries(Object.entries(radios).map(([id, radio], idx) => ([id, { ...radio, transmitting: (idx === radioIdx ? transmitting : radio.transmitting) }]))));

    const micGain = trackControls.get(radioIdx)?.micGain;
    if (micGain) {
      micGain.gain.value = transmitting ? 1 : 0;
    }
  }, [trackControls]);

  return (
    <>
      <Head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="cesium/Widgets/widgets.css" />
      </Head>

      <div className="flex relative h-[100vh] w-[100vw]">
        <div className="flex flex-col w-[620px]">
          <C2Panel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
          <RadioPanel radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} onMonitoringChange={onMonitoringChange} onTransmittingChange={onTransmittingChange} />
        </div>
        <ResizablePanes uniqueId="one" className="flex-1">
          <Pane id="P0" size={3}>
            <Toaster position="top-left" containerStyle={{ position: 'relative' }} />
            <MapPanel weather={weather} aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
          </Pane>
          <Pane id="P1" size={1} minSize={1}>
            <TimelinePanel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
          </Pane>
        </ResizablePanes>
      </div>
    </>
  )
}
