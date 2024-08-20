import C2Panel from '@/components/C2Panel'
import RadioPanel from '@/components/RadioPanel'
import TimelinePanel from '@/components/TimelinePanel'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useResizeDetector } from 'react-resize-detector'
import { Pane, ResizablePanes } from 'resizable-panes-react'

const MapPanel = dynamic(
  () => import('../components/MapPanel'),
  { ssr: false }
);

type LatLonTuple = [number, number]

export default function Home() {
  const [selectedAircraftCallsign, setSelectedAircraftCallsign] = useState<string | undefined>(undefined);

  const apiRef = useRef<any>();
  const { width, ref } = useResizeDetector();

  useEffect(() => {
    apiRef.current?.setSize?.('P0', 600);
  }, [apiRef, width]);

  const aircraft = [
    {
      callsign: 'N73146',
      position: [-76.0707383, 42.7117244] as LatLonTuple,
      track: 0,
      altitude: 100,
      speed: 100,
      altimeter: 100,

      targetAltitude: 100,
      targetSpeed: 100,

      armedCommand: undefined,

      state: 1,
      phase: 2,
      origin: { icao: 'KPDX', name: 'Portland International Airport' },
      destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
    },
    {
      callsign: 'N66083',
      position: [-76.0707383, 42.7117244] as LatLonTuple,
      track: 0,
      altitude: 100,
      speed: 100,
      altimeter: 100,

      targetAltitude: 100,
      targetSpeed: 100,

      armedCommand: undefined,

      state: 1,
      phase: 2,
      origin: { icao: 'KPDX', name: 'Portland International Airport' },
      destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
    },
    {
      callsign: 'N72PE',
      position: [-76.0707383, 42.7117244] as LatLonTuple,
      track: 0,
      altitude: 100,
      speed: 100,
      altimeter: 100,

      targetAltitude: 100,
      targetSpeed: 100,

      armedCommand: undefined,

      state: 1,
      phase: 2,
      origin: { icao: 'KPDX', name: 'Portland International Airport' },
      destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
    },
    {
      callsign: 'N820FE',
      position: [-76.0707383, 42.7117244] as LatLonTuple,
      track: 0,
      altitude: 100,
      speed: 100,
      altimeter: 100,

      targetAltitude: 100,
      targetSpeed: 100,

      armedCommand: undefined,

      state: 1,
      phase: 2,
      origin: { icao: 'KPDX', name: 'Portland International Airport' },
      destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
    },
    // {
    //   callsign: 'N821FE',
    //   position: [-76.0707383, 42.7117244] as LatLonTuple,
    //   track: 0,
    //   altitude: 100,
    //   speed: 100,
    //   altimeter: 100,

    //   targetAltitude: 100,
    //   targetSpeed: 100,

    //   armedCommand: undefined,

    //   state: 1,
    //   phase: 2,
    //   origin: { icao: 'KPDX', name: 'Portland International Airport' },
    //   destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
    // },
    // {
    //   callsign: 'N822FE',
    //   position: [-76.0707383, 42.7117244] as LatLonTuple,
    //   track: 0,
    //   altitude: 100,
    //   speed: 100,
    //   altimeter: 100,

    //   targetAltitude: 100,
    //   targetSpeed: 100,

    //   armedCommand: undefined,

    //   state: 1,
    //   phase: 2,
    //   origin: { icao: 'KPDX', name: 'Portland International Airport' },
    //   destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
    // },
    // {
    //   callsign: 'N823FE',
    //   position: [-76.0707383, 42.7117244] as LatLonTuple,
    //   track: 0,
    //   altitude: 100,
    //   speed: 100,
    //   altimeter: 100,

    //   targetAltitude: 100,
    //   targetSpeed: 100,

    //   armedCommand: undefined,

    //   state: 1,
    //   phase: 2,
    //   origin: { icao: 'KPDX', name: 'Portland International Airport' },
    //   destination: { icao: 'KCVO', name: 'Corvallis Municipal Airport' },
    // },
  ]

  const radios = [...aircraft.map(({ callsign }, idx) => ({
    id: idx,
    aircraft: callsign,
    facility: 'Cascade Appch',
    frequency: '123.450',
    receiving: Math.random() > 0.5,
    monitoring: true,
    transmitting: false,
  })), {
    id: 'wild',
    aircraft: undefined,
    facility: 'KPDX ATIS',
    frequency: '123.450',
    receiving: false,
    monitoring: true,
    transmitting: false,
  }]

  const resizerWidth = 2;
  const leftPanelWidth = 600;

  return (
    <>
      <Head>
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="cesium/Widgets/widgets.css" />
      </Head>

      <div ref={ref} style={{ height: '100vh', width: '100vw', position: 'relative' }}>
        {width && width > leftPanelWidth && (
        <ResizablePanes uniqueId="one" unit="ratio" minMaxUnit="pixel" vertical resizerSize={resizerWidth} onReady={(api: any) => { apiRef.current = api }}>
          <Pane id="P0" size={leftPanelWidth} minSize={leftPanelWidth}>
            <div className="w-full h-full flex flex-col">
              <C2Panel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
              <RadioPanel radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
            </div>
          </Pane>
          <Pane id="P1" size={width - leftPanelWidth - 2}>
            <ResizablePanes uniqueId='two'>
              <Pane id="P0" size={3}>
                <Toaster position="top-left" containerStyle={{ position: 'relative' }} />
                <MapPanel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
              </Pane>
              <Pane id="P1" size={1} minSize={1}>
                <TimelinePanel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
              </Pane>
            </ResizablePanes>
          </Pane>
        </ResizablePanes>
        )}
      </div>
    </>
  )
}
