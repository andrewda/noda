import C2Panel from '@/components/C2Panel'
import RadioPanel, { RadioCommunicationBoard } from '@/components/RadioPanel'
import TimelinePanel from '@/components/TimelinePanel'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { Pane, ResizablePanes } from 'resizable-panes-react'

import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogOverlay, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useButtonPanels } from '@/hooks/use-button-panel'
import { useSimulation } from '@/hooks/use-simulation'
import useStreamDeck from '@/hooks/use-stream-deck'
import { useAudioMonitor, usePeerConnection } from '@/lib/communications'
import { useSocket, useSocketEvent } from '@/lib/socket'
import { PauseIcon } from '@radix-ui/react-icons'

const MapPanel = dynamic(
  () => import('../components/MapPanel'),
  { ssr: false }
);

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
  const { paused, aircraft, weather } = useSimulation({
    onAircraftAdded: (aircraft, globalTime) => {
      if (globalTime > 0) {
        toast(`New aircraft: ${aircraft.callsign}`, { duration: 10000 });
      }
    }
  });
  const [radios, setRadios] = useState<Record<string, RadioCommunicationBoard>>(Object.fromEntries(Array.from(Array(8).keys()).map((i) => [i.toString(), makeRadio(i.toString())])));

  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected'>(socket?.connected ? 'connected' : 'disconnected');
  const [selectedAircraftCallsign, setSelectedAircraftCallsign] = useState<string | undefined>(undefined);

  useSocketEvent('connect', () => setConnectionState('connected'));
  useSocketEvent('disconnect', () => setConnectionState('disconnected'));

  const { peerConnection, connectionStatus, dataChannel, tracks, trackControls, createOffer } = usePeerConnection({ streamCount: 8 });
  // const localTracks = useMemo(() => new Map(Array.from(trackControls?.entries() ?? []).map(([i, { outputTrack }]) => [i, outputTrack])), [trackControls]);
  const [transmitStartTime, setTransmitStartTime] = useState<Date>();

  const remoteAudioMonitors = useAudioMonitor(tracks);
  // const localAudioMonitors = useAudioMonitor(localTracks);

  const remoteFrequencyMonitors = useMemo(() => {
    const monitors = new Map<string, boolean>();

    remoteAudioMonitors.forEach((monitor, i) => {
      const aircraftItem = aircraft[Object.keys(aircraft)[i]];
      if (aircraftItem?.frequency) {
        monitors.set(aircraftItem.frequency, monitor || monitors.get(aircraftItem.frequency) || false);
      }
    });

    return monitors;
  }, [remoteAudioMonitors, aircraft]);

  useEffect(() => {
    if (!selectedAircraftCallsign && Object.keys(aircraft).length > 0) {
      setSelectedAircraftCallsign(Object.keys(aircraft)[0]);
    };
  }, [aircraft, selectedAircraftCallsign])

  useEffect(() => {
    const newRadios = Object.fromEntries(Object.entries(radios).map(([id, radio], idx) => {
      const aircraftIdent = Object.keys(aircraft)[idx];
      const { frequency } = aircraft[aircraftIdent] ?? '';
      return ([id, {
        ...radio,
        aircraft: aircraftIdent,
        frequency,
        // receiving: remoteAudioMonitors.get(idx) ?? false,
        receiving: remoteFrequencyMonitors.get(frequency) ?? false,
      }]);
    }));

    if (JSON.stringify(newRadios) !== JSON.stringify(radios)) {
      setRadios(newRadios);
    }
  }, [aircraft, radios, remoteFrequencyMonitors]);

  const onToggleMonitoring = useCallback((radioIdx: number) => {
    setRadios((radios) => Object.fromEntries(Object.entries(radios).map(([id, radio], idx) => ([id, { ...radio, monitoring: (idx === radioIdx ? !radio.monitoring : radio.monitoring) }]))));
  }, []);

  const onMonitoringChange = useCallback((radioIdx: number, monitoring: boolean) => {
    setRadios((radios) => Object.fromEntries(Object.entries(radios).map(([id, radio], idx) => ([id, { ...radio, monitoring: (idx === radioIdx ? monitoring : radio.monitoring) }]))));
  }, []);

  const onTransmittingChange = useCallback((radioIdx: number, transmitting: boolean) => {
    setRadios((radios) => Object.fromEntries(Object.entries(radios).map(([id, radio], idx) => ([id, { ...radio, transmitting: (idx === radioIdx ? transmitting : radio.transmitting) }]))));

    const micGain = trackControls.get(radioIdx)?.micGain;
    if (micGain) {
      micGain.gain.value = transmitting ? 1 : 0;
    }

    if (transmitting) {
      setTransmitStartTime(new Date());
    } else {
      socket?.emit('command', { aircraft: radios[radioIdx].aircraft, command: 'transmit', payload: { frequency: radios[radioIdx].frequency, start: transmitStartTime, end: new Date() } });
    }
  }, [socket, radios, transmitStartTime, trackControls]);

  const onSetFrequency = useCallback((radioIdx: number, frequency: string) => {
    socket?.emit('command', { aircraft: radios[radioIdx].aircraft, command: 'frequency', payload: frequency });
  }, [socket, radios]);

  const onSetSelectedAircraft = useCallback((callsign: string | undefined) => {
    if (!callsign) return;

    socket?.emit('command', { aircraft: callsign, command: 'select' });
    setSelectedAircraftCallsign(callsign);
  }, [socket, setSelectedAircraftCallsign]);

  const { streamDecks } = useStreamDeck();

  useButtonPanels({ buttonPanels: streamDecks, onTransmitting: onTransmittingChange, onToggleMonitoring: onToggleMonitoring, radios, selectedAircraftCallsign });

  return (
    <div className="flex relative h-[100vh] w-[100vw]">
      <AlertDialog open={paused || Object.keys(aircraft).length === 0}>
        <AlertDialogOverlay className="bg-black/40" />
        <AlertDialogContent className="flex flex-col justify-center items-center w-[80vw] h-[80vh] max-w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex flex-col items-center gap-2"><PauseIcon width="4em" height="auto" /> Simulation Paused</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col w-[620px] gap-1">
        <RadioPanel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={onSetSelectedAircraft} onMonitoringChange={onMonitoringChange} onTransmittingChange={onTransmittingChange} onSetFrequency={onSetFrequency} />
        <C2Panel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={onSetSelectedAircraft} />
      </div>
      <ResizablePanes uniqueId="one" className="flex-1">
        <Pane id="P0" size={3}>
          <Toaster position="top-left" containerStyle={{ position: 'relative' }} />
          <MapPanel weather={weather} aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={onSetSelectedAircraft} />
        </Pane>
        <Pane id="P1" size={1} minSize={1}>
          <TimelinePanel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={onSetSelectedAircraft} />
        </Pane>
      </ResizablePanes>
    </div>
  )
}
