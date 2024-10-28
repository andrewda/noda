import { useState } from 'react';
import { useForm } from 'react-hook-form';

import MapPanel from '@/components/MapPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSimulation } from '@/hooks/use-simulation';
import { useSocket, useSocketEvent } from '@/lib/socket';

export default function ExperimenterPage() {
  const socket = useSocket();
  const { register, handleSubmit, watch, getValues, resetField, setValue } = useForm();

  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected'>(socket?.connected ? 'connected' : 'disconnected');

  const { lastMessageTime, aircraft } = useSimulation();

  const commandInit = () => {
    socket?.emit('runSimulation', 'StudyFullFlight');

    // TODO: this is a little hacky, but it works for now
    setTimeout(() => {
      socket?.emit('command', {
        aircraft: null,
        command: 'init',
        payload: [
          { callsign: 'HMT 110', departure_airport: 'KPDX', departure_runway: 'RW28L', arrival_airport: 'KCVO', arrival_runway: 'RW17', approach: 'R17', flight_plan: ['YIBPU', 'ADLOW'] },
          { callsign: 'HMT 120', departure_airport: 'KPDX', departure_runway: 'RW28L', arrival_airport: 'KSLE', arrival_runway: 'RW13', approach: 'R13', flight_plan: ['YIBPU', 'UBG'] },
          { callsign: 'HMT 130', departure_airport: 'KPDX', departure_runway: 'RW28L', arrival_airport: 'KMMV', arrival_runway: 'RW22', approach: 'R22', flight_plan: ['YIBPU', 'MULES', 'OSWEG', 'OZIER'] },
          { callsign: 'HMT 140', departure_airport: 'KPDX', departure_runway: 'RW28L', arrival_airport: 'KRDM', arrival_runway: 'RW11', approach: 'R11', flight_plan: ['YIBPU', 'CUKIS', 'JJACE', 'JJETT', 'YONKU'] },

          { callsign: 'HMT 150', departure_airport: 'KPDX', departure_runway: 'RW28R', arrival_airport: 'KEUG', arrival_runway: 'RW16R', approach: 'R16R-Y', flight_plan: ['JALAG', 'OSWEG', 'MAGOT', 'SHEDD'] },
          { callsign: 'HMT 160', departure_airport: 'KPDX', departure_runway: 'RW28R', arrival_airport: 'KHIO', arrival_runway: 'RW13R', approach: 'R13R', flight_plan: ['JALAG', 'DUCKA'] },
          { callsign: 'HMT 170', departure_airport: 'KPDX', departure_runway: 'RW28R', arrival_airport: 'KKLS', arrival_runway: 'RW12', approach: 'R12', flight_plan: ['JALAG', 'LOATH', 'AMAVE'] },
        ]
      });
    }, 2000);
  };

  const commandTakeoff = () => {
    socket?.emit('command', { aircraft: getValues('takeoffAircraft'), command: 'takeoff' });
    setValue('takeoffAircraft', '');
  };

  const startSimulation = () => {
    socket?.emit('runSimulation', getValues('simulationName'));
    setValue('simulationName', '');
  };

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
            <Button className="w-36" onClick={commandInit}>Start Simulation</Button>
          </div>

          <div className="flex gap-4">
            <Input className="flex-1" type="text" placeholder="Aircraft Callsign" {...register('takeoffAircraft')} />
            <Button className="w-36" disabled={watch('takeoffAircraft') === ''} onClick={commandTakeoff}>Takeoff</Button>
          </div>

          <div className="flex gap-4">
            <Input className="flex-1" type="text" placeholder="Weather Event" {...register('weatherEvent')} />
            <Button className="w-36" disabled={watch('weatherEvent') === ''} onClick={commandTakeoff}>Begin Weather</Button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="text-sm">Last Message Time: <span className="font-mono">{lastMessageTime?.toLocaleString() ?? '—'}</span></div>
          <div className="text-sm">Number of Aircraft: <span className="font-mono">{Object.keys(aircraft).length}</span></div>
          {Object.entries(aircraft).map(([callsign, aircraft]) => (
            <div key={callsign} className="flex gap-4 items-center">
              <div className="w-8 h-8 rounded-full border border-neutral-400 flex-shrink-0"></div>
              <div className="flex-grow">
                <div className="font-mono">{callsign}</div>
                <div className="text-xs font-mono text-neutral-400">{aircraft.altitude.toFixed(0)} ft / {aircraft.tas.toFixed(0)} kt</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full h-full flex-1">
        <MapPanel aircraft={aircraft} radios={{}} selectedAircraftCallsign={undefined} onSelectAircraft={undefined} />
      </div>
    </div>
  )
}
