import { AircraftStateBoard } from "@/components/C2Panel";
import { useSocketEvent } from "@/lib/socket";
import { useState } from "react";

export type UseSimulationProps = {
  onAircraftAdded?: (aircraft: AircraftStateBoard, globalTime: number) => void;
}

export const useSimulation = (props?: UseSimulationProps) => {
  const { onAircraftAdded } = props ?? {};

  const [lastMessageTime, setLastMessageTime] = useState<Date>();
  const [globalTime, setGlobalTime] = useState<number>();
  const [paused, setPaused] = useState<boolean>(false);
  const [weather, setWeather] = useState<string | undefined>(undefined);
  const [aircraft, setAircraft] = useState<Record<string, AircraftStateBoard>>({});
  const [backgroundAircraft, setBackgroundAircraft] = useState<Record<string, AircraftStateBoard>>({});

  useSocketEvent('simulationData', (data) => {
    const aircraftData = Object.fromEntries<AircraftStateBoard>(data.aircraft.filter(({ controlType }: AircraftStateBoard) => !controlType || controlType === 'participant').map((aircraft: AircraftStateBoard) => [aircraft.callsign, aircraft]));
    const newAircraft = Object.keys(aircraftData).filter((callsign) => !aircraft[callsign]);

    const backgroundAircraftData = Object.fromEntries<AircraftStateBoard>(data.aircraft.filter(({ controlType }: AircraftStateBoard) => controlType === 'non-participant').map((aircraft: AircraftStateBoard) => [aircraft.callsign, aircraft]));

    if (onAircraftAdded && newAircraft.length > 0) {
      newAircraft.forEach((callsign) => onAircraftAdded(aircraftData[callsign], data.global_time));
    }

    setLastMessageTime(new Date());
    setGlobalTime(data.global_time);
    setWeather(data.weather);
    setAircraft(aircraftData);
    setBackgroundAircraft(backgroundAircraftData);
    setPaused(data.paused);
  });

  return { lastMessageTime, globalTime, paused, aircraft, backgroundAircraft, weather };
}
