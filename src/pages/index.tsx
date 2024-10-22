import C2Panel from '@/components/C2Panel'
import RadioPanel, { RadioCommunicationBoard } from '@/components/RadioPanel'
import TimelinePanel from '@/components/TimelinePanel'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useReducer, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { Pane, ResizablePanes } from 'resizable-panes-react'

import { useSimulation } from '@/hooks/use-simulation'
import { socket, useSocketEvent } from '@/lib/socket'

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

export default function Home() {
  const { aircraft } = useSimulation();
  const [radios, dispatchRadios] = useReducer(radiosReducer, {
    'wild': {
      id: 'wild',
      aircraft: undefined,
      facility: 'KPDX ATIS',
      frequency: '123.450',
      receiving: false,
      monitoring: true,
      transmitting: false,
    },
  });

  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected'>(socket.connected ? 'connected' : 'disconnected');
  const [selectedAircraftCallsign, setSelectedAircraftCallsign] = useState<string | undefined>(undefined);

  useSocketEvent('connect', () => setConnectionState('connected'));
  useSocketEvent('disconnect', () => setConnectionState('disconnected'));

  return (
    <>
      <Head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="cesium/Widgets/widgets.css" />
      </Head>

      <div className="flex relative h-[100vh] w-[100vw]">
        <div className="flex flex-col w-[620px]">
          <C2Panel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
          <RadioPanel radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
        </div>
        <ResizablePanes uniqueId="one" className="flex-1">
          <Pane id="P0" size={3}>
            <Toaster position="top-left" containerStyle={{ position: 'relative' }} />
            <MapPanel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
          </Pane>
          <Pane id="P1" size={1} minSize={1}>
            <TimelinePanel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
          </Pane>
        </ResizablePanes>
      </div>
    </>
  )
}
