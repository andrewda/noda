import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useForm } from 'react-hook-form';

import MapPanel from '@/components/MapPanel';
import { Button } from '@/components/ui/button';
import { useSimulation } from '@/hooks/use-simulation';
import { useSocket, useSocketEvent } from '@/lib/socket';
import { Combobox } from '@/components/ui/combobox';
import SpeakIcon from '@mui/icons-material/RecordVoiceOver';
import CheckIcon from '@mui/icons-material/Check';
import SwapIcon from '@mui/icons-material/SwapHoriz';

import configs from './configs.json';
import { Pane, ResizablePanes } from 'resizable-panes-react';
import TimelinePanel from '@/components/TimelinePanel';
import { useScript } from '@/hooks/use-script';
import { useAudioMonitor, useLocalStream, usePeerConnection } from '@/lib/communications';
import { AircraftGrid } from '@/components/AircraftGrid';
import { cn } from '@/lib/utils';

const secondsToMmss = (seconds: number | undefined) => {
  if (!seconds || seconds <= 0) return '0:00';

  const displayMinutes = Math.floor(seconds / 60);
  const displaySeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${displayMinutes}:${displaySeconds}`;
}

export default function ExperimenterPage() {
  const socket = useSocket();
  const { register, handleSubmit, watch, getValues, resetField, setValue } = useForm();

  const localStream = useLocalStream();
  const { peerConnection, connectionStatus, dataChannel, tracks, trackControls, createOffer } = usePeerConnection({ streamCount: 8 });
  const localTracks = useMemo(() => new Map(Array.from(trackControls?.entries() ?? []).map(([i, { outputTrack }]) => [i, outputTrack])), [trackControls]);

  const remoteAudioMonitors = useAudioMonitor(tracks);
  const localAudioMonitors = useAudioMonitor(localTracks);

  const [configIndex, setConfigIndex] = useState<string | undefined>(undefined);
  const [selectedAircraftCallsign, setSelectedAircraftCallsign] = useState<string | undefined>(undefined);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [running, setRunning] = useState<boolean>(false);
  const [transmitStartTime, setTransmitStartTime] = useState<Date>();
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected'>(socket?.connected ? 'connected' : 'disconnected');

  const { lastMessageTime, paused, globalTime, aircraft, weather } = useSimulation();

  const config = useMemo(() => configs['groups'][Number(configIndex)], [configIndex]);

  const [spokenScriptEvents, setSpokenScriptEvents] = useState<string[]>([]);
  const [completedScriptEvents, setCompletedScriptEvents] = useState<string[]>([]);

  const [backgroundCompletedScriptEvents, setBackgroundCompletedScriptEvents] = useState<string[]>([]);

  const activeScript = useScript(startTime, config?.script ?? [], spokenScriptEvents, completedScriptEvents, running ? aircraft : {}, globalTime ?? 0);
  const backgroundScript = useScript(startTime, config?.background_script ?? [], [], backgroundCompletedScriptEvents, running ? aircraft : {}, globalTime ?? 0);

  useEffect(() => {
    if (backgroundScript?.length >= 3) {
      console.log('SKIPPING BACKGROUND SCRIPT -- TOO MANY EVENTS');
      socket?.emit('command', { aircraft: '', command: 'debug', payload: 'skipping background script -- too many events' });

      setBackgroundCompletedScriptEvents((prev) => [...prev, ...backgroundScript.map((scriptEvent: any) => scriptEvent.id)]);
      return;
    };

    if (backgroundScript?.length > 0) {
      backgroundScript.forEach((scriptEvent: any) => {
        const aircraftItem = aircraft[scriptEvent?.callsign];

        const trackIndex = Object.keys(aircraft).findIndex((callsign) => callsign === scriptEvent.callsign);
        setBackgroundCompletedScriptEvents((prev) => [...prev, scriptEvent.id]);

        trackControls.get(trackIndex)?.playAudio(`/speech/${scriptEvent.file}`).then((audioNode) => {
          const transmitStartTime = new Date();
          audioNode.onended = () => {
            socket?.emit('command', { aircraft: '', command: 'transmit-atc-bg', payload: { frequency: aircraftItem?.frequency ?? '', file: scriptEvent.file, start: transmitStartTime, end: new Date() } });
          }
        });
      });
    }
  }, [socket, JSON.stringify(backgroundScript)]);

  const beginTransmit = useCallback((scriptEvent?: any) => {
    // TODO: start broadcasting on freuqency of {callsign}
    setTransmitStartTime(new Date());

    const aircraftIdx = Object.keys(aircraft).findIndex((callsign) => callsign === scriptEvent?.callsign);
    const micGain = trackControls.get(aircraftIdx)?.micGain;
    if (micGain) {
      micGain.gain.value = 1;
    }
  }, [aircraft, trackControls]);

  const endTransmit = useCallback((scriptEvent?: any) => {
    const aircraftItem = aircraft[scriptEvent?.callsign];
    socket?.emit('command', { aircraft: scriptEvent?.callsign, command: 'transmit-atc', payload: { frequency: aircraftItem?.frequency ?? '', dialog: scriptEvent?.dialog, start: transmitStartTime, end: new Date() } });
    setTransmitStartTime(undefined);
    // setSpokenScriptEvents((prev) => [...prev, scriptEvent.id]);

    // const aircraftIdx = Object.keys(aircraft).findIndex((callsign) => callsign === scriptEvent?.callsign);
    // const micGain = trackControls.get(aircraftIdx)?.micGain;
    // if (micGain) {
    //   micGain.gain.value = 0;
    // }
    trackControls.forEach(({ micGain }) => micGain.gain.value = 0);
  }, [socket, transmitStartTime, aircraft, trackControls]);

  const completeScriptEvent = useCallback((scriptEvent: any) => {
    const aircraftItem = aircraft[scriptEvent?.callsign];
    socket?.emit('command', { aircraft: scriptEvent?.callsign, command: 'atc-interaction-complete', payload: { frequency: aircraftItem?.frequency ?? '', dialog: scriptEvent?.dialog } });
    setCompletedScriptEvents((prev) => [...prev, scriptEvent.id]);
  }, [socket, aircraft]);

  const commandInit = useCallback(() => {
    socket?.emit('runSimulation', 'StudyFullFlight');

    setSpokenScriptEvents([]);
    setCompletedScriptEvents([]);
    setBackgroundCompletedScriptEvents([]);
    setRunning(false);

    if (!config) {
      alert('No config selected');
      return;
    }

    // TODO: this is a little hacky, but it works for now
    setTimeout(() => {
      socket?.emit('command', {
        aircraft: null,
        command: 'init',
        payload: {
          name: config.name.replace(/\s/g, '_').toLowerCase(),
          paused: true,
          weather: config.weather,
          // @ts-ignore
          aircraft: config.aircraft.filter(({ defer }) => !defer).map(({ defer, ...aircraft }) => aircraft),
          // @ts-ignore
          order: config.aircraft.filter(({ defer }) => !defer).map(({ callsign }) => callsign),
        }
      }, () => {
        setStartTime(new Date());
        setRunning(true);
      });
    }, 2000);
  }, [socket, config]);

  const commandReplacement = useCallback((removeAircraft: string, replacementAircraft: string) => {
    if (aircraft[removeAircraft].flightPhase < 10) {
      const confirmation = confirm(`Aircraft ${removeAircraft} has not yet landed. Are you sure you want to replace it with ${replacementAircraft}?`);
      if (!confirmation) return false;
    }

    // @ts-ignore
    const { defer, ...newAircraft } = config.aircraft.find(({ callsign }) => callsign === replacementAircraft);
    const newOrder = Object.keys(aircraft).map((callsign) => callsign === removeAircraft ? replacementAircraft : callsign);

    // Create a new aircraft
    socket?.emit('command', {
      aircraft: null,
      command: 'init',
      payload: {
        aircraft: [newAircraft],
        order: newOrder,
      }
    });

    return true;
  }, [socket, config, aircraft]);

  const handleReplacementClick = useCallback(() => {
    const removeAircraft = getValues('removeAircraft');
    const replacementAircraft = getValues('replacementAircraft');

    const replaced = commandReplacement(removeAircraft, replacementAircraft);
    if (!replaced) return;

    setValue('removeAircraft', undefined);
    setValue('replacementAircraft', undefined);
  }, [getValues, setValue, commandReplacement]);

  const commandPaused = useCallback((paused: boolean) => {
    socket?.emit('command', { aircraft: null, command: 'paused', payload: paused });
  }, [socket]);

  useSocketEvent('connect', () => setConnectionState('connected'));
  useSocketEvent('disconnect', () => setConnectionState('disconnected'));

  const renderScriptEvent = (scriptEvent: any) => {
    if (scriptEvent.dialog) {
      return (
        <>
          <div className="flex-grow">
            <div className="font-mono">
              <span className={cn('cursor-pointer text-neutral-50', { 'text-fuchsia-400': scriptEvent.callsign === selectedAircraftCallsign })} onClick={() => setSelectedAircraftCallsign(scriptEvent.callsign)}>{scriptEvent.callsign}</span>
              <span className="text-xs text-neutral-400 ml-2">{scriptEvent.condition ?? ''}</span>
            </div>
            <div className="text-xs font-mono text-neutral-200">{scriptEvent.dialog}</div>
          </div>
          <div className="flex gap-2">
            <Button className="w-12 active:bg-cyan-500/80" onMouseDown={() => beginTransmit(scriptEvent)} onMouseUp={() => endTransmit(scriptEvent)}><SpeakIcon style={{ fontSize: '1.2em' }} /></Button>
            <Button className="w-12" onClick={() => completeScriptEvent(scriptEvent)}><CheckIcon style={{ fontSize: '1.2em' }} /></Button>
          </div>
        </>
      )
    } else if (scriptEvent.replace) {
      return (
        <>
          <div className="flex-grow">
            <div className="font-mono">
              <span className={cn('cursor-pointer text-neutral-50', { 'text-fuchsia-400': scriptEvent.callsign === selectedAircraftCallsign })} onClick={() => setSelectedAircraftCallsign(scriptEvent.callsign)}>{scriptEvent.callsign}</span>
              <span className="text-xs text-neutral-400 ml-2">{scriptEvent.condition ?? ''}</span>
            </div>
            <div className="text-xs italic font-mono text-neutral-200">Replace with {scriptEvent.replace}</div>
          </div>
          <div className="flex gap-2">
            <Button className="w-12" onClick={() => commandReplacement(scriptEvent.callsign, scriptEvent.replace)}><SwapIcon style={{ fontSize: '1.2em' }} /></Button>
            <Button className="w-12" onClick={() => completeScriptEvent(scriptEvent)}><CheckIcon style={{ fontSize: '1.2em' }} /></Button>
          </div>
        </>
      )
    }

    return (
      <>Unknown script event</>
    )
  }

  return (
    <div className="flex items-start h-screen">
      <div className="flex flex-col gap-4 p-4 w-full h-full max-w-xl flex-1 relative">
        <div className="absolute top-4 right-4">
          <span className="font-mono">{secondsToMmss(globalTime)}</span>
        </div>

        <h1 className="text-4xl flex items-center self-center gap-4 mt-4" onMouseEnter={(evt) => (evt.target as HTMLDivElement).title = lastMessageTime?.toLocaleString() ?? '—'}>
          Mission Control
          <div title={`WebSocket status: ${connectionState}`} className={`w-6 h-6 rounded-full shadow-inner ${connectionState === 'connected' ? 'bg-green-400 shadow-green-800' : 'bg-red-400 shadow-red-800'}`}></div>
        </h1>

        <div className="w-96 flex flex-col self-center gap-4">
          <div className="flex w-full gap-4">
            <Combobox className="flex-1" label="Simulation Name" options={configs.groups.map(({ name, description }, index) => ({ label: `${name} (${description})`, value: index.toString() }))} value={configIndex} onValueChange={setConfigIndex} />
            <Button className="w-36" onClick={commandInit}>Start Simulation</Button>
          </div>

          <div className="flex w-full gap-4">
            <Button className="w-full" disabled={paused} onClick={() => commandPaused(true)}>Pause</Button>
            <Button className="w-full" disabled={!paused} onClick={() => commandPaused(false)}>Resume</Button>
          </div>

          <div className="flex w-full gap-4">
            <Combobox className="flex-1" label="Old Acft" options={Object.keys(aircraft).map((callsign) => ({ label: callsign, value: callsign }))} value={watch('removeAircraft')} onValueChange={(value) => setValue('removeAircraft', value)} />
            <Combobox className="flex-1" label="New Acft" options={config?.aircraft.filter(({ callsign }) => !aircraft[callsign]).map(({ callsign }) => ({ label: callsign, value: callsign })) ?? []} value={watch('replacementAircraft')} onValueChange={(value) => setValue('replacementAircraft', value)} />
            <Button className="w-36" disabled={!watch('removeAircraft') || !watch('replacementAircraft')} onClick={handleReplacementClick}>Replace</Button>
          </div>
        </div>

        <div className="flex gap-2 text-sm self-center">
          <span suppressHydrationWarning>
            <span>Local:</span> <span className={localStream ? 'text-green-500' : 'text-neutral-400'}>{localStream ? 'connected' : 'disconnected'}</span>
          </span>
          <span>|</span>
          <span suppressHydrationWarning>
            <span>Peer:</span> <span className={`cursor-pointer ${connectionStatus === 'connected' ? 'text-green-500' : 'text-neutral-400'}`} onClick={() => createOffer?.()}>{connectionStatus ?? 'disconnected'}</span>
          </span>
        </div>

        <AircraftGrid
          aircraft={aircraft}
          remoteAudioMonitors={remoteAudioMonitors}
          selectedAircraftCallsign={selectedAircraftCallsign}
          onSelectAircraft={setSelectedAircraftCallsign}
          onStartTransmit={(callsign) => beginTransmit({ callsign })}
          onEndTransmit={(callsign) => endTransmit({ callsign })}
        />

        <div className="flex flex-col self-start gap-2 w-full h-full overflow-y-scroll">
          <AnimatePresence>
            {activeScript?.map((scriptEvent: any) => (
              <motion.div
                key={scriptEvent.id}
                className="flex flex-row gap-2 bg-neutral-800 p-3 rounded-md border border-neutral-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {renderScriptEvent(scriptEvent)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <ResizablePanes uniqueId="one" className="flex-1">
        <Pane id="P0" size={3}>
          <MapPanel weather={weather} aircraft={aircraft} radios={undefined} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
        </Pane>
        <Pane id="P1" size={1} minSize={1}>
          <TimelinePanel aircraft={aircraft} radios={undefined} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
        </Pane>
      </ResizablePanes>

    </div>
  );
}
