import { useSocket } from '@/lib/socket';
import LaunchIcon from '@mui/icons-material/Launch';
import { PopoverTrigger } from '@radix-ui/react-popover';
import { Check, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Airport from '../../public/images/airport.svg';
import FromTo from '../../public/images/from_to.svg';
import Ownship from '../../public/images/ownship.svg';
import DirectTo from '../../public/images/direct_to.svg';
import { FlightPlanModal } from './modals/flight-plan';
import { MonitorIndicator, RadioCommunicationBoard } from './RadioPanel';
import { ArmableInput } from './ui/armable-input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Popover, PopoverContent } from './ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

enum AircraftState {
  Ground,
  Air,
}

enum AircraftPhase {
  Idle,
  GroundTaxiOut,
  Takeoff,
  Landing,
  EnRoute,
  Approach,
  Hold,
  Landed,
  GroundTaxiIn,
  Parked,
}

type Airport = {
  icao: string,
  name: string,
}

export type AircraftStateBoard = {
  callsign: string;
  position: [number, number];
  track: number;
  heading: number;
  altitude: number;
  altimeter: number;
  tas: number;
  cas: number;
  vs: number;

  aircraftType: string;
  flightPhase: number; // TODO: enum
  configuration: number; // TODO: enum
  lateralMode: number; // TODO: enum
  verticalMode: number; // TODO: enum

  flightPlan: string[];
  flightPlanEnroute: string[];
  flightPlanPos: [number, number][];
  flightPlanTargetSpeed: number[];
  flightPlanIndex: number;
  dist: number;

  departureAirport: string;
  departureRunway: string;
  sid: string;
  arrivalAirport: string;
  arrivalRunway: string;
  star: string;
  approach: string;

  armedCommand: string | undefined,

  frequency: string;
  controlType: 'participant' | 'non-participant';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatAltitude(altitude: number) {
  if (altitude >= 18000) {
    return `FL${Math.floor(altitude / 100)}`;
  }

  return altitude.toLocaleString();
}

function calculateAltimeter(altimeter: string) {
  const numericAltimeter = Number(altimeter);

  if (numericAltimeter > 1000) {
    return (numericAltimeter / 100).toFixed(2);
  } else if (numericAltimeter > 100) {
    return (numericAltimeter / 10).toFixed(1);
  } else {
    return altimeter;
  }
}

function formatAltitudeString(altitude: number, vs: number) {
  let vsString = '0';
  if (vs > 0) {
    vsString = `+${Math.abs(Math.round(vs)).toLocaleString()}`;
  } else if (vs < 0) {
    vsString = `-${Math.abs(Math.round(vs)).toLocaleString()}`;
  }

  return `${(Math.round(altitude / 10) * 10).toLocaleString()} (${vsString} fpm)`;
}

function getFlightPhaseString(flightPhase: number) {
  // AT_GATE_ORIGIN = 1,
  // TAXI_ORIGIN = 2,
  // TAKEOFF = 3,
  // INITIAL_CLIMB = 4,
  // CLIMB = 5,
  // CRUISE = 6,
  // DESCENT = 7,
  // APPROACH = 8,
  // LANDING = 9,
  // TAXI_DEST = 10,
  // AT_GATE_DEST = 11

  switch (flightPhase) {
    case 1:
      return 'Gate';
    case 2:
      return 'Taxi';
    case 3:
      return 'Takeoff';
    case 4:
      return 'Initial Climb';
    case 5:
      return 'Climb';
    case 6:
      return 'Cruise';
    case 7:
      return 'Descent';
    case 8:
      return 'Approach';
    case 9:
      return 'Landing';
    case 10:
      return 'Taxi';
    case 11:
      return 'Gate';
    default:
      return 'Unknown';
  }
}

type AircraftListProps = {
  aircraft: Record<string, AircraftStateBoard>,
  radios: Record<string, RadioCommunicationBoard> | undefined;
  selectedAircraftCallsign: string | undefined,
  onSelectAircraft: (aircraftCallsign: string) => void
}
function AircraftListGutter({ aircraft, radios, selectedAircraftCallsign, onSelectAircraft }: AircraftListProps) {
  return (
    <div className="flex flex-col w-32 min-w-32 items-center self-stretch">
      {Object.values(aircraft).map((aircraftStateBoard, idx) => (
        <div
          key={aircraftStateBoard.callsign}
          className={`flex flex-col items-start self-stretch pl-3 pr-2 pt-3 pb-3 cursor-pointer border-gray-400 border-b-2 hover:brightness-125 ${aircraftStateBoard.callsign === selectedAircraftCallsign ? 'text-fuchsia-400 bg-fuchsia-950/30' : 'text-gray-400'}`}
          onClick={() => onSelectAircraft(aircraftStateBoard.callsign)}
        >
          <div className="flex gap-2 items-center w-full">
            <Ownship width={20} height={20} />
            <div className="flex flex-col justify-center items-start w-full">
              <div className="flex items-center justify-between font-mono text-sm pl-[1px] w-full">
                {aircraftStateBoard.callsign}
                <MonitorIndicator receive={radios?.[idx]?.receiving ?? false} className="w-3 h-3" />
              </div>
              <div className="font-normal text-xs">{getFlightPhaseString(aircraftStateBoard.flightPhase)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type ArmedCommand = {
  label: string,
  command: string,
  payload?: any,
  status: 'armed' | 'executing' | 'success' | 'failure',
}

type AircraftCommandPanelProps = {
  aircraft: AircraftStateBoard | undefined,
  radio: RadioCommunicationBoard | undefined,
}
function AircraftCommandPanel({ aircraft, radio }: AircraftCommandPanelProps) {
  const [armedCommand, setArmedCommand] = useState<ArmedCommand | undefined>();
  const [resetTimeout, setResetTimeout] = useState<NodeJS.Timeout | undefined>();

  const socket = useSocket();

  const [heading, setHeading] = useState<number | undefined>();
  const [altitude, setAltitude] = useState<number | undefined>();
  const [airspeed, setAirspeed] = useState<number | undefined>();
  const [altimeter, setAltimeter] = useState<string | undefined>();

  // Disarm command when switching aircraft
  useEffect(() => setArmedCommand(undefined), [aircraft?.callsign]);

  useEffect(() => {
    // If new command is armed, clear timeout
    if (armedCommand?.status === 'armed') {
      clearTimeout(resetTimeout);
    }

    if (armedCommand?.status === 'success') {
      const newResetTimeout = setTimeout(() => setArmedCommand(undefined), 3000);
      setResetTimeout(newResetTimeout);
    }
  }, [armedCommand]);

  const armCommand = useCallback((command: Omit<ArmedCommand, 'status'>) => {
    if (armedCommand?.status === 'armed' || armedCommand?.status === 'executing') {
      toast.error(`Cannot arm command: Command already ${armedCommand?.status}!`);
      return;
    }

    socket?.emit('command', { aircraft: aircraft?.callsign, command: 'arm', payload: { command: command.command, payload: command.payload } });
    setArmedCommand({ ...command, status: 'armed' });
  }, [socket, aircraft?.callsign, armedCommand, setArmedCommand])

  const disarmCommand = useCallback(() => {
    if (!armedCommand) return;

    socket?.emit('command', { aircraft: aircraft?.callsign, command: 'disarm', payload: { command: armedCommand.command, payload: armedCommand.payload } });
    setArmedCommand(undefined);
  }, [socket, aircraft?.callsign, armedCommand, setArmedCommand])

  const executeArmedCommand = useCallback(() => {
    if (!armedCommand) return;

    setArmedCommand({ ...armedCommand, status: 'executing' });

    socket?.emit('command', {
      aircraft: aircraft?.callsign,
      command: armedCommand.command,
      payload: armedCommand.payload,
    }, () => {
      setArmedCommand({ ...armedCommand, status: 'success' });
    });
  }, [socket, aircraft?.callsign, armedCommand, setArmedCommand])

  if (!aircraft) return <></>

  return (
    <div className="flex flex-col w-full h-full pl-3 pr-3 pt-4 pb-4 items-center gap-4 flex-grow self-stretch min-w-0 bg-neutral-900 border-r-2 border-neutral-950">
      <div className="flex flex-col items-center gap-4 self-stretch">
        <div className="flex flex-col pt-2 pb-2 items-start gap-2 self-stretch">
          <div className="flex items-center gap-2 self-stretch text-fuchsia-400">
            <Ownship width={24} height={24} />
            <div className="font-mono text-xl">{aircraft?.callsign}</div>
            <MonitorIndicator receive={radio?.receiving ?? false} className="w-3.5 h-3.5" />
          </div>
          <div className="flex pl-1 pr-1 justify-start items-center gap-3 w-full">
            <div className="flex flex-1 pl-1 pr-1 justify-start items-center gap-2 w-full">
              <FromTo width={30} height={50} className="text-fuchsia-500 grow-0 shrink-0 basis-[30px]" />
              <div className="flex flex-col items-center gap-2 min-w-0">
                {[aircraft.departureAirport, aircraft.arrivalAirport].map((icao, idx) => (
                  <div className="flex items-center gap-2 self-stretch" key={icao + idx}>
                    <Airport width={24} height={24} className="text-fuchsia-500 grow-0 shrink-0 basis-[24px]" />
                    <div className="flex flex-col text-gray-200 min-w-0">
                      <div className="font-mono text-sm pl-[1px]">{icao}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex flex-wrap gap-1 w-full rounded-md border border-input/70 bg-background px-2 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                {([...(aircraft.flightPlan?.toSpliced(-2) ?? []), `${aircraft.arrivalAirport} ${aircraft.arrivalRunway}`]).map((item, i) => {
                  const isDirectTo = aircraft.lateralMode === 2 && aircraft.flightPlanIndex === i;
                  return (<div key={i} className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Badge className={`cursor-pointer select-none ${isDirectTo ? 'bg-fuchsia-600 hover:bg-fuchsia-600/90 font-bold' : 'bg-primary/80 hover:bg-primary/70'}`}>{item}</Badge>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel className={isDirectTo ? 'text-fuchsia-400' : ''}>{item}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className={`flex items-center [&>svg]:size-6 ${isDirectTo ? 'cursor-not-allowed' : 'cursor-pointer'}`} disabled={isDirectTo} onClick={() => armCommand({ label: `Direct To ${item}`, command: 'flight_plan', payload: { flight_plan_index: i } })}>
                          <DirectTo /> Direct To
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                    </DropdownMenu>
                  </div>)
                })}
              </div>
            </div>
          </div>
        </div>
        <hr className="w-full border-neutral-600 border-b-2" />
        <div className="w-[70%] items-center flex flex-col gap-2 pb-4">
          <ArmableInput value={heading ?? ''} placeholder={Math.round(aircraft.heading)?.toLocaleString()} labelText="Heading" armText={heading === undefined ? 'Arm' : `Arm ${heading}`} armDisabled={heading === undefined} type="number" unit="deg" onChange={(e: any) => setHeading(e.target.value !== '' ? clamp(Number(e.target.value), -360, 360) : undefined)} onArm={() => { armCommand({ label: `Heading ${heading}`, command: 'heading', payload: heading }); setHeading(undefined); }} />
          <ArmableInput value={altitude ?? ''} placeholder={formatAltitudeString(aircraft.altitude, aircraft.vs)} labelText="Altitude" armText={altitude === undefined ? 'Arm' : `Arm ${formatAltitude(altitude)} ft`} armDisabled={altitude === undefined} type="number" unit="ft" onChange={(e: any) => setAltitude(e.target.value !== '' ? clamp(Number(e.target.value), 0, 30000) : undefined)} onArm={() => { armCommand({ label: `Altitude ${formatAltitude(altitude ?? 0)}`, command: 'altitude', payload: altitude }); setAltitude(undefined); }} />
          <ArmableInput value={airspeed ?? ''} placeholder={Math.round(aircraft.tas)?.toLocaleString()} labelText="Airspeed" armText={airspeed === undefined ? 'Arm' : `Arm ${airspeed} kt`} armDisabled={airspeed === undefined} type="number" unit="kt" onChange={(e: any) => setAirspeed(e.target.value !== '' ? clamp(Number(e.target.value), 0, 180) : undefined)} onArm={() => { armCommand({ label: `Speed ${airspeed} kt`, command: 'airspeed', payload: airspeed }); setAirspeed(undefined); }} />
          <ArmableInput value={altimeter ?? ''} placeholder={aircraft.altimeter?.toFixed(2) ?? '30.00'} labelText="Altimeter" armText={altimeter === undefined ? 'Arm' : `Arm ${altimeter}`} armDisabled={altimeter === undefined} type="number" unit="inHg" onChange={(e: any) => setAltimeter(e.target.value !== '' ? calculateAltimeter(e.target.value) : undefined)} onArm={() => { armCommand({ label: `Altimeter ${altimeter}`, command: 'altimeter', payload: altimeter }); setAltimeter(undefined); }} />

          {aircraft.flightPhase === 2 && <Button className="relative w-full mt-4" onClick={() => armCommand({ label: 'Takeoff', command: 'takeoff' })}>Takeoff</Button>}

          {/* <Popover>
            <PopoverTrigger asChild>
              <Button className="relative w-full mt-4">
                Modify Flight Plan
                <LaunchIcon className="absolute right-4" fontSize="small" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <FlightPlanModal departureAirport={aircraft.departureAirport} departureRunway={aircraft.departureRunway} arrivalAirport={aircraft.arrivalAirport} arrivalRunway={aircraft.arrivalRunway} flightPlan={aircraft.flightPlanEnroute} flightPlanIndex={aircraft.flightPlanIndex} approach={aircraft.approach} onModify={() => {}} />
            </PopoverContent>
          </Popover> */}
        </div>

        <hr className="w-full border-neutral-600 border-b-2" />

        <div className="w-[80%] flex flex-col gap-4">
          <div className="self-center text-neutral-300">Armed Command</div>
          <div className="self-center font-mono text-sm flex">
            {armedCommand?.label ?? '\u2013'}
          </div>
          <div className="flex items-center gap-2 self-stretch">
            <Button className="flex-1" variant="outline" disabled={armedCommand?.status !== 'armed'} onClick={disarmCommand}>Disarm</Button>
            <Button variant={armedCommand?.status === 'success' ? 'positive' : 'accent'} className="flex-1 relative" disabled={armedCommand?.status !== 'armed'} onClick={executeArmedCommand}>
              Execute
              {armedCommand?.status === 'executing' && <Loader2 className="absolute right-4 h-4 w-4 animate-spin" />}
              {armedCommand?.status === 'success' && <Check className="absolute right-4 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type C2PanelProps = {
  aircraft: Record<string, AircraftStateBoard>,
  radios: Record<string, RadioCommunicationBoard> | undefined;
  selectedAircraftCallsign: string | undefined,
  onSelectAircraft: (aircraftCallsign: string) => void
}
export default function C2Panel({ aircraft, radios, selectedAircraftCallsign, onSelectAircraft }: C2PanelProps) {
  const selectedAircraft = useMemo(() => selectedAircraftCallsign !== undefined ? aircraft[selectedAircraftCallsign] : undefined, [aircraft, selectedAircraftCallsign]);
  const selectedRadio = useMemo(() => selectedAircraftCallsign !== undefined ? Object.values(radios ?? {}).find((radio) => radio.aircraft === selectedAircraftCallsign) : undefined, [radios, selectedAircraftCallsign]);

  return (
    <div className="flex flex-row flex-grow">
      {/* <AircraftListGutter aircraft={aircraft} radios={radios} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={onSelectAircraft} /> */}
      <AircraftCommandPanel aircraft={selectedAircraft} radio={selectedRadio} />
    </div>
  )
}
