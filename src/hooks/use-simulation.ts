import { AircraftStateBoard } from "@/components/C2Panel";
import { useSocketEvent } from "@/lib/socket";
import { useState } from "react";

export const useSimulation = () => {
  const [lastMessageTime, setLastMessageTime] = useState<Date>();
  const [aircraft, setAircraft] = useState<Record<string, AircraftStateBoard>>({});

  useSocketEvent('simulationData', (data) => {
    setLastMessageTime(new Date());
    setAircraft(Object.fromEntries(data.aircraft.map((aircraft: AircraftStateBoard) => [aircraft.callsign, aircraft])));
  });

  return {lastMessageTime, aircraft};
}
