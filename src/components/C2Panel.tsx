import { useMemo } from "react"
import Image from "next/image"

import Ownship from '../../public/images/ownship.svg';
import FromTo from '../../public/images/from_to.svg';
import Airport from '../../public/images/airport.svg';
import { MonitorIndicator, RadioCommunicationBoard } from "./RadioPanel";

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
  callsign: string,
  position: [number, number],
  track: number,
  altitude: number,
  speed: number,
  altimeter: number,

  targetAltitude: number,
  targetSpeed: number,

  armedCommand: string | undefined,

  state: AircraftState,
  phase: AircraftPhase,
  origin: Airport,
  destination: Airport,
}

type AircraftListProps = {
  aircraft: AircraftStateBoard[],
  selectedAircraftCallsign: string | undefined,
  onSelectAircraft: (aircraftCallsign: string) => void
}
function AircraftListGutter({ aircraft, selectedAircraftCallsign, onSelectAircraft }: AircraftListProps) {
  return (
    <div className="flex flex-col w-32 min-w-32 items-center self-stretch">
      {aircraft.map((aircraftStateBoard) => (
        <div
          key={aircraftStateBoard.callsign}
          className={`flex flex-col items-start self-stretch pl-3 pr-4 pt-3 pb-3 cursor-pointer border-gray-400 border-b-2 hover:brightness-125 ${aircraftStateBoard.callsign === selectedAircraftCallsign ? 'text-fuchsia-400' : 'text-gray-400'}`}
          onClick={() => onSelectAircraft(aircraftStateBoard.callsign)}
        >
          <div className="flex gap-2 items-center">
            <Ownship width={20} height={20} />
            <div className="flex flex-col justify-center items-start">
              <div className="font-mono text-sm pl-[1px]">{aircraftStateBoard.callsign}</div>
              <div className="font-normal text-xs">Enroute</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type AircraftCommandPanelProps = {
  aircraft: AircraftStateBoard | undefined,
  radio: RadioCommunicationBoard | undefined,
}
function AircraftCommandPanel({ aircraft, radio }: AircraftCommandPanelProps) {
  if (!aircraft) return <></>

  return (
    <div className="flex flex-col w-full h-full pl-3 pr-3 pt-4 pb-4 items-center gap-4 flex-grow self-stretch min-w-0 bg-zinc-900">
      <div className="flex flex-col items-center gap-2 self-stretch">
        <div className="flex flex-col pt-2 pb-2 items-start gap-2 self-stretch">
          <div className="flex items-center gap-2 self-stretch text-fuchsia-400">
            <Ownship width={24} height={24} />
            <div className="font-mono text-xl">{aircraft?.callsign}</div>
            <MonitorIndicator receive={radio?.receiving ?? false} className="w-4 h-4" />
          </div>
          <div className="flex pl-1 pr-1 justify-start items-center gap-1 w-full">
            <div className="flex pl-1 pr-1 justify-start items-center gap-2 w-full">
              {/* <Image src={fromTo} alt="" width={20} height={35} /> */}
              <FromTo width={30} height={50} className="text-fuchsia-500 grow-0 shrink-0 basis-[30px]" />
              <div className="flex flex-col items-center gap-2 min-w-0">
                {[aircraft.origin, aircraft.destination].map(({ icao, name }) => (
                  <div className="flex items-center gap-2 self-stretch" key={icao}>
                    {/* <Image src={airport} alt="" width={16} height={16} /> */}
                    <Airport width={24} height={24} className="text-fuchsia-500 grow-0 shrink-0 basis-[24px]" />
                    <div className="flex flex-col text-gray-200 min-w-0">
                      <div className="font-mono text-sm pl-[1px]">{icao}</div>
                      <div className="font-normal text-xs whitespace-nowrap text-ellipsis overflow-hidden">{name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <hr className="w-full border-neutral-600 border-b-2" />
        <div>
          <input type="text" className="w-full text-sm text-gray-200 bg-zinc-950 border-none focus:outline-none" />
          <input type="text" className="w-full text-sm text-gray-200 bg-zinc-950 border-none focus:outline-none" />
          <button className="btn-primary w-full text-sm">Send Test</button>
          <button className="w-full text-sm text-gray-200 bg-zinc-950 border-none focus:outline-none">Send</button>
          <div className="flex items-center gap-2 self-stretch">
            <button className="w-full text-sm text-gray-200 bg-zinc-950 border-none focus:outline-none"></button>
            <button className="w-full text-sm text-gray-200 bg-zinc-950 border-none focus:outline-none"></button>
          </div>
        </div>
        <hr className="w-full border-neutral-600 border-b-2" />
        <div>
          <div>Armed Command</div>
          <div>Climb 3500</div>
          <div className="flex items-center gap-2 self-stretch">
            <button className="w-full text-sm text-gray-200 bg-zinc-950 border-none focus:outline-none">Execute</button>
            <button className="w-full text-sm text-gray-200 bg-zinc-950 border-none focus:outline-none">Disarm</button>
          </div>
        </div>
      </div>
    </div>
  );
}

type C2PanelProps = {
  aircraft: AircraftStateBoard[],
  radios: Array<RadioCommunicationBoard> | undefined;
  selectedAircraftCallsign: string | undefined,
  onSelectAircraft: (aircraftCallsign: string) => void
}
export default function C2Panel({ aircraft, radios, selectedAircraftCallsign, onSelectAircraft }: C2PanelProps) {
  const selectedAircraft = useMemo(() => aircraft.find((aircraftStateBoard) => aircraftStateBoard.callsign === selectedAircraftCallsign), [aircraft, selectedAircraftCallsign]);
  const selectedRadio = useMemo(() => radios?.find((radio) => radio.aircraft === selectedAircraftCallsign), [radios, selectedAircraftCallsign]);

  return (
    <div className="flex flex-row flex-grow">
      <AircraftListGutter aircraft={aircraft} selectedAircraftCallsign={selectedAircraftCallsign} onSelectAircraft={onSelectAircraft} />
      <AircraftCommandPanel aircraft={selectedAircraft} radio={selectedRadio} />
    </div>
  )
}
