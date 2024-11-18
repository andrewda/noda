import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import MapPanel from '@/components/MapPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSimulation } from '@/hooks/use-simulation';
import { useSocket, useSocketEvent } from '@/lib/socket';
import { Combobox } from '@/components/ui/combobox';

import configs from './configs.json';
import { Pane, ResizablePanes } from 'resizable-panes-react';
import TimelinePanel from '@/components/TimelinePanel';
import { frequencyToFacility } from '@/components/RadioPanel';

export default function ExperimenterPage() {
  const socket = useSocket();
  const { register, handleSubmit, watch, getValues, resetField, setValue } = useForm();

  const [configIndex, setConfigIndex] = useState<string | undefined>(undefined);
  const [selectedAircraftCallsign, setSelectedAircraftCallsign] = useState<string | undefined>(undefined);

  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected'>(socket?.connected ? 'connected' : 'disconnected');

  const { lastMessageTime, aircraft, weather } = useSimulation();

  const commandInit = useCallback(() => {
    socket?.emit('runSimulation', 'StudyFullFlight');

    // TODO: this is a little hacky, but it works for now
    setTimeout(() => {
      const config = configs['groups'][Number(configIndex)];

      socket?.emit('command', {
        aircraft: null,
        command: 'init',
        payload: {
          name: `group_${configIndex}`,
          paused: true,
          weather: config.weather,
          aircraft: config.initial_aircraft,
        }
      });
    }, 2000);
  }, [socket, configIndex]);

  const commandTakeoff = useCallback(() => {
    socket?.emit('command', { aircraft: getValues('takeoffAircraft'), command: 'takeoff' });
    setValue('takeoffAircraft', '');
  }, [socket, getValues, setValue]);

  const commandRemove = useCallback(() => {
    const callsign = getValues('removeAircraft');

    if (aircraft[callsign].flightPhase < 10) {
      const confirmation = confirm(`Aircraft ${callsign} has not yet landed. Are you sure you want to delete it?`);
      if (!confirmation) return;
    }

    socket?.emit('command', { aircraft: callsign, command: 'delete' });
    setValue('removeAircraft', '');
  }, [aircraft, socket, getValues, setValue]);

  const commandPaused = useCallback((paused: boolean) => {
    socket?.emit('command', { aircraft: null, command: 'paused', payload: paused });
  }, [socket]);

  useSocketEvent('connect', () => setConnectionState('connected'));
  useSocketEvent('disconnect', () => setConnectionState('disconnected'));

  return (
    <div className="flex items-start h-screen">
      <div className="flex flex-col items-center gap-4 w-full max-w-lg flex-1">
        <h1 className="text-4xl flex items-center gap-4 mt-20">
          Mission Control
          <div title={`WebSocket status: ${connectionState}`} className={`w-6 h-6 rounded-full shadow-inner ${connectionState === 'connected' ? 'bg-green-400 shadow-green-800' : 'bg-red-400 shadow-red-800'}`}></div>
        </h1>

        <div className="w-96 flex flex-col gap-4">
          <div className="flex gap-4">
            {/* <Input className="flex-1" type="text" placeholder="Simulation Name" {...register('simulationName')} /> */}
            <Combobox className="w-full" label="Simulation Name" options={configs.groups.map(({ name }, index) => ({ label: name, value: index.toString() }))} value={configIndex} onValueChange={setConfigIndex} />
            <Button className="w-36" onClick={commandInit}>Start Simulation</Button>
          </div>

          <div className="flex gap-4">
            <Button className="w-36" onClick={() => commandPaused(true)}>Pause</Button>
            <Button className="w-36" onClick={() => commandPaused(false)}>Resume</Button>
          </div>

          <div className="flex gap-4">
            <Input className="flex-1" type="text" placeholder="Aircraft Callsign" {...register('takeoffAircraft')} />
            <Button className="w-36" disabled={watch('takeoffAircraft') === ''} onClick={commandTakeoff}>Takeoff</Button>
          </div>

          <div className="flex gap-4">
            <Input className="flex-1" type="text" placeholder="Aircraft Callsign" {...register('removeAircraft')} />
            <Button className="w-36" disabled={watch('removeAircraft') === ''} onClick={commandRemove}>Remove</Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-sm">Last Message Time: <span className="font-mono">{lastMessageTime?.toLocaleString() ?? '—'}</span></div>
          <div className="text-sm">Number of Aircraft: <span className="font-mono">{Object.keys(aircraft).length}</span></div>
          {Object.entries(aircraft).map(([callsign, aircraft]) => (
            <div key={callsign} className="flex gap-4 items-center hover:brightness-75 cursor-pointer" onClick={() => setSelectedAircraftCallsign(callsign)}>
              <div className="w-3 h-3 rounded-full border border-neutral-400 flex-shrink-0"></div>
              <div className="flex-grow">
                <div className={`font-mono ${callsign === selectedAircraftCallsign ? 'text-fuchsia-400' : 'text-neutral-200'}`}>{callsign}</div>
                <div className="text-xs font-mono text-neutral-400">{aircraft.altitude.toFixed(0)} ft / {aircraft.tas.toFixed(0)} kt</div>
                <div className="text-xs font-mono text-neutral-400">{aircraft.frequency} / {frequencyToFacility[aircraft.frequency] ?? ''}</div>
              </div>
            </div>
          ))}
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
  )

  // return (
  //   <>
  //     <div className="flex relative h-[100vh] w-[100vw]">
  //       <div className="flex flex-col w-[620px]">
  //         <C2Panel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
  //         <RadioPanel radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} onMonitoringChange={onMonitoringChange} onTransmittingChange={onTransmittingChange} />
  //       </div>
  //       <ResizablePanes uniqueId="one" className="flex-1">
  //         <Pane id="P0" size={3}>
  //           <Toaster position="top-left" containerStyle={{ position: 'relative' }} />
  //           <MapPanel weather={weather} aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
  //         </Pane>
  //         <Pane id="P1" size={1} minSize={1}>
  //           <TimelinePanel aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={setSelectedAircraftCallsign} />
  //         </Pane>
  //       </ResizablePanes>
  //     </div>
  //   </>
  // )
}
