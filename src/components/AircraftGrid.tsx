import { useEffect, useRef, useState } from "react";
import { AircraftStateBoard } from "./C2Panel";
import { frequencyToFacility, MonitorIndicator } from "./RadioPanel";
import { Button } from "./ui/button";
import SpeakIcon from '@mui/icons-material/RecordVoiceOver';
import { cn } from "@/lib/utils";

export interface AircraftGridProps {
  aircraft: Record<string, AircraftStateBoard>;
  selectedAircraftCallsign: string | undefined;
  remoteAudioMonitors: Map<number, boolean>;
  localFrequencyMonitors: Map<string, boolean>;
  onSelectAircraft: ((aircraftCallsign: string | undefined) => void) | undefined;
  onStartTransmit: ((aircraftCallsign: string | undefined) => void) | undefined;
  onEndTransmit: ((aircraftCallsign: string | undefined) => void) | undefined;
}

export const AircraftGrid = ({ aircraft, remoteAudioMonitors, localFrequencyMonitors, selectedAircraftCallsign, onSelectAircraft, onStartTransmit, onEndTransmit }: AircraftGridProps) => {
  const [flashingCallsigns, setFlashingCallsigns] = useState<Set<string> | undefined>(undefined);
  const previousAircraftRef = useRef(aircraft);

  useEffect(() => {
    const flashingUpdates: string[] = [];

    Object.entries(aircraft).forEach(([callsign, data]) => {
      const prevData = previousAircraftRef.current[callsign];

      if (prevData && data.frequency !== prevData.frequency) {
        flashingUpdates.push(callsign);
      }
    });

    if (flashingUpdates.length > 0) {
      setFlashingCallsigns((prev) => {
        flashingUpdates.forEach((callsign) => prev?.add(callsign));
        return new Set(prev?.values() ?? []);
      });

      setTimeout(() => {
        setFlashingCallsigns((prev) => {
          flashingUpdates.forEach((callsign) => prev?.delete(callsign));
          return new Set(prev?.values() ?? []);
        });
      }, 5000);
    }

    previousAircraftRef.current = aircraft;
  }, [aircraft]);

  return (
    <div className="grid grid-cols-2 grid-rows-4 grid-flow-col gap-2 mx-4">
      {Object.entries(aircraft).map(([callsign, aircraft], idx) => (
        <div key={callsign} className={`flex flex-row gap-4 items-center border ${callsign === selectedAircraftCallsign ? 'border-fuchsia-400 bg-fuchsia-950/30' : 'border-neutral-400'} rounded-md px-2 py-1`}>
          <div className="flex-grow hover:brightness-75 cursor-pointer" onClick={() => onSelectAircraft?.(callsign)}>
            <div className="flex gap-2 items-center">
              <MonitorIndicator receive={remoteAudioMonitors.get(idx) ?? false} className="w-3 h-3" />
              <div className={`font-mono ${callsign === selectedAircraftCallsign ? 'text-fuchsia-400' : 'text-neutral-200'}`}>{callsign}</div>
            </div>
            <div className="text-xs font-mono text-neutral-400">{aircraft.altitude.toFixed(0)} ft / {aircraft.tas.toFixed(0)} kt</div>
            <div className={cn('text-xs font-mono text-neutral-400', { 'flash-change': flashingCallsigns?.has(callsign), 'text-fuchsia-400': localFrequencyMonitors.get(aircraft.frequency ?? '') ?? false })}>
              {aircraft.frequency} / {frequencyToFacility[aircraft.frequency] ?? ''}
            </div>
          </div>
          <Button className="w-12 active:bg-cyan-500/80" onMouseDown={() => onStartTransmit?.(callsign)} onMouseUp={() => onEndTransmit?.(callsign)}>
            <SpeakIcon style={{ fontSize: '1.2em' }} />
          </Button>
        </div>
      ))}
    </div>
  );
}
