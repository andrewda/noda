import Flop from '../../public/images/flop.svg';
import Monitor from '../../public/images/monitor.svg';
import Ownship from '../../public/images/ownship.svg';
import Transmit from '../../public/images/transmit.svg';

export type RadioCommunicationBoard = {
  id: string;
  aircraft: string | undefined;
  facility: string;
  frequency: string;
  receiving: boolean;
  monitoring: boolean;
  transmitting: boolean;
}

type ReceiveIndicatorProps = {
  receive: boolean;
  className?: string;
}
export function MonitorIndicator({ receive, className }: ReceiveIndicatorProps) {
  return (
    <div className={`rounded-full border-slate-400 border-2 border-solid ${receive ? 'bg-[#00d30a]' : 'bg-none'} ${className}`}></div>
  );
}

type RadioProps = {
  radio: RadioCommunicationBoard;
  selected: boolean;
  className?: string;
  onSelect: () => void;
}
function Radio({ radio, selected, className, onSelect }: RadioProps) {
  const monitoring = true;
  const transmitting = false;

  return (
    <div className={`w-full h-20 px-1 py-1.5 rounded border ${selected ? 'border-fuchsia-400' : 'border-[#ababab]'} flex-col justify-between items-start inline-flex overflow-hidden ${className}`}>
      <div className="self-stretch px-0.5 justify-between items-center inline-flex">
        <div onClick={onSelect} className={`h-5 relative flex flex-row items-center gap-1 ${radio.aircraft ? 'cursor-pointer hover:brightness-75' : ''} ${selected ? 'text-fuchsia-400' : 'text-gray-200'}`}>
          {radio.aircraft ? (
            <>
              <Ownship width={16} height={16} />
              <div className="text-sm font-bold font-mono">{radio.aircraft}</div>
            </>
          ) : <div className="text-xs italic font-bold text-gray-400">No Aircraft</div>}
        </div>
        <MonitorIndicator receive={radio.receiving} className="w-3.5 h-3.5" />
      </div>
      <div className="flex self-stretch px-1 justify-between items-start gap-5">
        <div className="flex-col flex-shrink-0 gap-1.5 justify-between items-center flex">
          <Monitor height={16} className={`cursor-pointer hover:brightness-75 ${monitoring ? 'text-teal-400' : 'text-gray-300'}`} />
          <Transmit height={16} className={`cursor-pointer hover:brightness-75 ${transmitting ? 'text-teal-400' : 'text-gray-300'}`} />
        </div>
        <div className="flex flex-grow flex-col justify-between items-end h-full min-w-0">
          <div className="inline-flex justify-end items-center gap-1 cursor-pointer text-gray-200 hover:brightness-75">
            <div className="text-sm font-semibold">{radio.frequency}</div>
            <div className="flex-shrink-0">
              <Flop width={20} />
            </div>
          </div>

          {/* Use dir="rtl" so that the text is truncated from the left side. */}
          <div className="text-[#ababab] text-xs font-medium text-right w-full whitespace-nowrap text-ellipsis overflow-hidden" dir="rtl">{radio.facility}</div>
        </div>
      </div>
    </div>
  )
}


type RadioPanelProps = {
  selectedAircraftCallsign: string | undefined;
  radios: Array<RadioCommunicationBoard>;
  onSelectAircraft: (aircraftCallsign: string | undefined) => void;
}
export default function RadioPanel({ radios, selectedAircraftCallsign, onSelectAircraft }: RadioPanelProps) {
  return (
    <div className="grid grid-cols-4 gap-4 m-3">
      {Object.values(radios).map((radio) => (
        <Radio key={radio.aircraft ?? 'wild'} radio={radio} selected={radio.aircraft ? radio.aircraft === selectedAircraftCallsign : false} onSelect={() => radio.aircraft ? onSelectAircraft(radio.aircraft) : null} className="last:col-start-4 justify-self-center" />
      ))}
    </div>
  );
}
