import { useEffect, useState, useRef } from 'react';
import Flop from '../../public/images/flop.svg';
import Monitor from '../../public/images/monitor.svg';
import Ownship from '../../public/images/ownship.svg';
import Transmit from '../../public/images/transmit.svg';
import { cn } from '@/lib/utils';

export type RadioCommunicationBoard = {
  id: string;
  aircraft: string | undefined;
  facility: string;
  frequency: string;
  monitoring: boolean;
  receiving: boolean;
  transmitting: boolean;
}

export const frequencyToFacility: Record<string, string> = {
  '123.000': 'CTAF',
  '123.450': 'KPDX TWR',
  '118.100': 'KPDX APP',
  '124.200': 'SEA CTR',
  '125.800': 'SEA CTR',
  '126.150': 'SEA CTR',
  '120.350': 'KUAO TWR',
  '119.100': 'KSLE TWR',
  '120.900': 'KTTD TWR',
  '124.500': 'KRDM TWR',
  '119.600': 'KEUG APP',
  '118.900': 'KEUG TWR',
  '119.300': 'KHIO TWR',
}

type ReceiveIndicatorProps = {
  receive: boolean;
  className?: string;
}
export function MonitorIndicator({ receive, className }: ReceiveIndicatorProps) {
  /*

  @keyframes diminish-border {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: 377; // 2 * π * 60 ≈ 377
    }
  }

  .animate-diminish {
    animation: diminish-border 10s linear forwards;
  }

  <svg class="w-32 h-32">
    <circle
      class="stroke-green-500 animate-diminish"
      cx="50%"
      cy="50%"
      r="60"
      fill="transparent"
      stroke-width="4"
      stroke-dasharray="377"
      stroke-dashoffset="0"
    ></circle>
  </svg>

  */

  return (
    <div className={cn('rounded-full border-slate-400 border-2 border-solid transition-[border,_box-shadow] ease-in', receive ? 'border-[#00d30a] bg-[#00d30a] shadow-[#00d30a] shadow-[0_0_6px_1px]' : 'bg-none', className)} style={{ transitionDuration: receive ? '0s' : '10s' }}></div>
  );
}

type RadioProps = {
  radio: RadioCommunicationBoard;
  selected: boolean;
  className?: string;
  onSelect: () => void;
  setMonitoring: (monitoring: boolean) => void;
  setTransmitting: (transmitting: boolean) => void;
  setFrequency: (frequency: string) => void;
}
function Radio({ radio, selected, className, onSelect, setMonitoring, setTransmitting, setFrequency }: RadioProps) {
  const [focused, setFocused] = useState<boolean>(false);
  const [internalFrequency, setInternalFrequency] = useState<string>(radio.frequency);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) {
      setInternalFrequency(radio.frequency);
    }
  }, [radio.frequency]);

  const handleFocus = (event: any) => {
    event.target.select();
    setFocused(true);
  }

  const handleBlur = (event: any) => {
    let value = parseFloat(event.target.value);

    if (!value) {
      setInternalFrequency(radio.frequency);
      return;
    };

    if (value < 100) {
      value += 100;
    }

    if (value > 137) {
      const firstThreeDigits = Number((value + '').slice(0, 3));
      if (firstThreeDigits < 108 || firstThreeDigits > 137) {
        value = Number(`1${value}`);
      }

      value = value / (10 ** ((value + '').length - 3));
    }

    if (value < 108.000 || value > 137.000) {
      value = Math.max(108.000, Math.min(137.000, value));
    }

    const freq = value.toFixed(3);
    setInternalFrequency(freq);

    if (freq !== radio.frequency) {
      setFrequency(freq);
    }

    setFocused(false);
  }

  const handleKeyDown = (event: any) => {
    if (event.key === 'Enter') {
      handleBlur(event);
      event.target.blur();
    }
    if (event.key === 'Escape') {
      setInternalFrequency(radio.frequency);
    }
  }

  return (
    <div onMouseDown={onSelect} className={`w-full h-20 px-1 py-1.5 rounded border ${radio.aircraft ? 'cursor-pointer hover:brightness-[0.85]' : ''} ${selected ? 'border-fuchsia-400 bg-fuchsia-950/30 hover:brightness-100' : 'border-[#ababab]'} flex-col justify-between items-start inline-flex overflow-hidden ${className}`}>
      <div className="self-stretch px-0.5 justify-between items-center inline-flex">
        <div className={`h-5 relative flex flex-row items-center gap-1 ${selected ? 'text-fuchsia-400' : 'text-gray-200'}`}>
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
          <div className="inline-flex justify-end items-center gap-1 cursor-pointer text-gray-200 hover:brightness-75" onClick={() => inputRef.current?.select()}>
            <input
              ref={inputRef}
              type="number"
              className="w-full text-sm text-right select-all text-gray-200 bg-transparent border-none focus:outline-none placeholder:text-gray-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={118.900}
              max={136.000}
              step={0.025}
              value={internalFrequency}
              onChange={(e) => setInternalFrequency(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <div className="flex-shrink-0">
              <Flop width={20} />
            </div>
          </div>

          {/* Use dir="rtl" so that the text is truncated from the left side. */}
          <div className="text-[#ababab] text-xs font-medium text-right w-full whitespace-nowrap text-ellipsis overflow-hidden" dir="rtl">{frequencyToFacility[internalFrequency] ?? ''}</div>
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
  onSetFrequency: (radio: number, frequency: string) => void;
}
export default function RadioPanel({ radios, selectedAircraftCallsign, onSelectAircraft, onMonitoringChange, onTransmittingChange, onSetFrequency }: RadioPanelProps) {
  return (
    <div className="grid grid-cols-4 gap-4 p-3 bg-neutral-900 border-r-2 border-neutral-950">
      {Object.values(radios).filter((radio, idx) => radio.aircraft || (idx === (Object.keys(radios).length ?? 0) - 1)).map((radio, i) => (
        <Radio
          key={i}
          radio={radio}
          selected={radio.aircraft ? radio.aircraft === selectedAircraftCallsign : false}
          onSelect={() => radio.aircraft ? onSelectAircraft(radio.aircraft) : null}
          setMonitoring={(monitoring) => onMonitoringChange(i, monitoring)}
          setTransmitting={(transmitting) => onTransmittingChange(i, transmitting)}
          setFrequency={(frequency) => onSetFrequency(i, frequency)}
          className="last:col-start-4 justify-self-center" />
      ))}
    </div>
  );
}
