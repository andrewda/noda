import { AircraftStateBoard } from "@/components/C2Panel";
import { useSocketEvent } from "@/lib/socket";
import { useState } from "react";

export const useSimulation = () => {
  const [lastMessageTime, setLastMessageTime] = useState<Date>();
  const [globalTime, setGlobalTime] = useState<number>();
  const [paused, setPaused] = useState<boolean>(false);
  const [weather, setWeather] = useState<string | undefined>(undefined);
  const [aircraft, setAircraft] = useState<Record<string, AircraftStateBoard>>({});

  useSocketEvent('simulationData', (data) => {
    setLastMessageTime(new Date());
    setGlobalTime(data.global_time);
    setWeather(data.weather);
    setAircraft(Object.fromEntries(data.aircraft.map((aircraft: AircraftStateBoard) => [aircraft.callsign, aircraft])));
    setPaused(data.paused);
  });

  return {lastMessageTime, globalTime, paused, aircraft, weather};
}
