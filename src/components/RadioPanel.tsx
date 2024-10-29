import Flop from '../../public/images/flop.svg';
import Monitor from '../../public/images/monitor.svg';
import Ownship from '../../public/images/ownship.svg';
import Transmit from '../../public/images/transmit.svg';
import { SelectFrequencyModal } from './modals/select-frequency';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export type RadioCommunicationBoard = {
  id: string;
  aircraft: string | undefined;
  facility: string;
  frequency: string;
  monitoring: boolean;
  receiving: boolean;
  transmitting: boolean;
}

type ReceiveIndicatorProps = {
  receive: boolean;
  className?: string;
}
export function MonitorIndicator({ receive, className }: ReceiveIndicatorProps) {
  return (
    <div className={`rounded-full border-slate-400 border-2 border-solid ${receive ? 'bg-[#00d30a] shadow-[#00d30a] shadow-[0_0_6px_1px]' : 'bg-none'} ${className}`}></div>
  );
}

type RadioProps = {
  radio: RadioCommunicationBoard;
  selected: boolean;
  className?: string;
  onSelect: () => void;
  setMonitoring: (monitoring: boolean) => void;
  setTransmitting: (transmitting: boolean) => void;
}
function Radio({ radio, selected, className, onSelect, setMonitoring, setTransmitting }: RadioProps) {

  const handleBlur = (event: any) => {
    let value = parseFloat(event.target.value);

    if (value < 100) {
      value += 100;
    }

    if (value < 118.900 || value > 136.000) {
      value = Math.max(118.900, Math.min(136.000, value));
    }

    event.target.value = value.toFixed(3);
  }

  return (
    <div className={`w-full h-20 px-1 py-1.5 rounded border ${selected ? 'border-fuchsia-400 bg-fuchsia-950/30' : 'border-[#ababab]'} flex-col justify-between items-start inline-flex overflow-hidden ${className}`}>
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
          <Monitor height={16} className={`cursor-pointer hover:brightness-75 ${radio.monitoring ? 'text-teal-400 drop-shadow-[0_0_4px]' : 'text-gray-300/60'}`} onClick={() => setMonitoring(!radio.monitoring)} />
          <Transmit height={16} className={`cursor-pointer hover:brightness-75 ${radio.transmitting ? 'text-teal-400 drop-shadow-[0_0_4px]' : 'text-gray-300/60'}`} onMouseDown={() => setTransmitting(true)} onMouseUp={() => setTransmitting(false)} />
        </div>
        <div className="flex flex-grow flex-col justify-between items-end h-full min-w-0">
          <div className="inline-flex justify-end items-center gap-1 cursor-pointer text-gray-200 hover:brightness-75">
            <input
              type="number"
              className="w-full text-sm text-right select-all text-gray-200 bg-transparent border-none focus:outline-none placeholder:text-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={118.900}
              max={136.000}
              step={0.025}
              placeholder={radio.frequency}
              onClick={(e) => (e.target as any).select()}
              onBlur={handleBlur}
            />
            <div className="flex-shrink-0">
              <Flop width={20} />
            </div>
          </div>
          {/* <Popover>
            <PopoverTrigger asChild>
              <div className="inline-flex justify-end items-center gap-1 cursor-pointer text-gray-200 hover:brightness-75">
                <div className="text-sm font-semibold">{radio.frequency}</div>
                <div className="flex-shrink-0">
                  <Flop width={20} />
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-32" side="top">
              <SelectFrequencyModal frequency={radio.frequency} />
            </PopoverContent>
          </Popover> */}

          {/* Use dir="rtl" so that the text is truncated from the left side. */}
          <div className="text-[#ababab] text-xs font-medium text-right w-full whitespace-nowrap text-ellipsis overflow-hidden" dir="rtl">{radio.facility}</div>
        </div>
      </div>
    </div>
  )
}

type RadioPanelProps = {
  selectedAircraftCallsign: string | undefined;
  radios: Record<string, RadioCommunicationBoard>;
  onSelectAircraft: (aircraftCallsign: string | undefined) => void;
  onMonitoringChange: (radio: number, monitoring: boolean) => void;
  onTransmittingChange: (radio: number, transmitting: boolean) => void;
}
export default function RadioPanel({ radios, selectedAircraftCallsign, onSelectAircraft, onMonitoringChange, onTransmittingChange }: RadioPanelProps) {
  return (
    <div className="grid grid-cols-4 gap-4 m-3">
      {Object.values(radios).filter((radio, idx) => radio.aircraft || (idx === (Object.keys(radios).length ?? 0) - 1)).map((radio, i) => (
        <Radio
          key={i}
          radio={radio}
          selected={radio.aircraft ? radio.aircraft === selectedAircraftCallsign : false}
          onSelect={() => radio.aircraft ? onSelectAircraft(radio.aircraft) : null}
          setMonitoring={(monitoring) => onMonitoringChange(i, monitoring)}
          setTransmitting={(transmitting) => onTransmittingChange(i, transmitting)}
          className="last:col-start-4 justify-self-center" />
      ))}
    </div>
  );
}
