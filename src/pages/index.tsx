import C2Panel, { AircraftStateBoard } from '@/components/C2Panel'
import RadioPanel, { RadioCommunicationBoard } from '@/components/RadioPanel'
import TimelinePanel from '@/components/TimelinePanel'
import { ThemeProvider } from '@/components/ui/theme-provider'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { use, useEffect, useReducer, useRef, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useResizeDetector } from 'react-resize-detector'
import { Pane, ResizablePanes } from 'resizable-panes-react'

import { socket, useSocketEvent } from '@/lib/socket';
import { useSimulation } from '@/hooks/use-simulation'

const MapPanel = dynamic(
  () => import('../components/MapPanel'),
  { ssr: false }
);

type LatLonTuple = [number, number];

function aircraftReducer(state: Record<string, AircraftStateBoard>, action: any) {
  switch (action.type) {
    case 'set':
      return { ...state, [action.payload.callsign]: action.payload };
    case 'setMany':
      return Object.fromEntries(action.payload.map((aircraft: AircraftStateBoard) => [aircraft.callsign, aircraft]));
    case 'remove':
      return Object.fromEntries(Object.entries(state).filter(([callsign]) => callsign !== action.payload));
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

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
  // const [aircraft, dispatchAircraft] = useReducer(aircraftReducer, {});
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

  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected'>('disconnected');
  const [selectedAircraftCallsign, setSelectedAircraftCallsign] = useState<string | undefined>(undefined);

  useEffect(() => {
    console.log('connectionState', connectionState);
    if (connectionState === 'connected') {
      console.log('Emitting takeoff command for HMT 110');
      socket.emit('command', {aircraft: 'HMT 110', command: 'takeoff', payload: {}});
    }
  }, [connectionState])

  useSocketEvent('connect', () => setConnectionState('connected'));
  useSocketEvent('disconnect', () => setConnectionState('disconnected'));

  console.log(aircraft)

  // const aircraft = [
  //   {
  //     callsign: 'HMT 110',
  //     position: [-76.0707383, 42.7117244] as LatLonTuple,
  //     track: 0,
  //     altitude: 8000,
  //     speed: 100,

  //     targetAltitude: 100,
  //     targetSpeed: 100,

  //     armedCommand: undefined,

  //     state: 1,
  //     phase: 2,
  //     origin: { icao: 'KPDX', name: 'Portland International Airport' },
  //     destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
  //   },
  //   {
  //     callsign: 'HMT 120',
  //     position: [-76.0707383, 42.7117244] as LatLonTuple,
  //     track: 0,
  //     altitude: 3600,
  //     speed: 100,

  //     targetAltitude: 100,
  //     targetSpeed: 100,

  //     armedCommand: undefined,

  //     state: 1,
  //     phase: 2,
  //     origin: { icao: 'KPDX', name: 'Portland International Airport' },
  //     destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
  //   },
  //   {
  //     callsign: 'HMT 130',
  //     position: [-76.0707383, 42.7117244] as LatLonTuple,
  //     track: 0,
  //     altitude: 9000,
  //     speed: 100,

  //     targetAltitude: 100,
  //     targetSpeed: 100,

  //     armedCommand: undefined,

  //     state: 1,
  //     phase: 2,
  //     origin: { icao: 'KPDX', name: 'Portland International Airport' },
  //     destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
  //   },
  //   {
  //     callsign: 'HMT 140',
  //     position: [-76.0707383, 42.7117244] as LatLonTuple,
  //     track: 0,
  //     altitude: 20000,
  //     speed: 100,

  //     targetAltitude: 100,
  //     targetSpeed: 100,

  //     armedCommand: undefined,

  //     state: 1,
  //     phase: 2,
  //     origin: { icao: 'KPDX', name: 'Portland International Airport' },
  //     destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
  //   },
  //   // {
  //   //   callsign: 'N821FE',
  //   //   position: [-76.0707383, 42.7117244] as LatLonTuple,
  //   //   track: 0,
  //   //   altitude: 100,
  //   //   speed: 100,
  //   //   altimeter: 100,

  //   //   targetAltitude: 100,
  //   //   targetSpeed: 100,

  //   //   armedCommand: undefined,

  //   //   state: 1,
  //   //   phase: 2,
  //   //   origin: { icao: 'KPDX', name: 'Portland International Airport' },
  //   //   destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
  //   // },
  //   // {
  //   //   callsign: 'N822FE',
  //   //   position: [-76.0707383, 42.7117244] as LatLonTuple,
  //   //   track: 0,
  //   //   altitude: 100,
  //   //   speed: 100,
  //   //   altimeter: 100,

  //   //   targetAltitude: 100,
  //   //   targetSpeed: 100,

  //   //   armedCommand: undefined,

  //   //   state: 1,
  //   //   phase: 2,
  //   //   origin: { icao: 'KPDX', name: 'Portland International Airport' },
  //   //   destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
  //   // },
  //   // {
  //   //   callsign: 'N823FE',
  //   //   position: [-76.0707383, 42.7117244] as LatLonTuple,
  //   //   track: 0,
  //   //   altitude: 100,
  //   //   speed: 100,
  //   //   altimeter: 100,

  //   //   targetAltitude: 100,
  //   //   targetSpeed: 100,

  //   //   armedCommand: undefined,

  //   //   state: 1,
  //   //   phase: 2,
  //   //   origin: { icao: 'KPDX', name: 'Portland International Airport' },
  //   //   destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
  //   // },
  // ]

  // const radios = [...aircraft.map(({ callsign }, idx) => ({
  //   id: idx,
  //   aircraft: callsign,
  //   facility: 'Cascade Appch',
  //   frequency: '123.450',
  //   receiving: Math.random() > 0.5,
  //   monitoring: true,
  //   transmitting: false,
  // })), {
  //   id: 'wild',
  //   aircraft: undefined,
  //   facility: 'KPDX ATIS',
  //   frequency: '123.450',
  //   receiving: false,
  //   monitoring: true,
  //   transmitting: false,
  // }]

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
