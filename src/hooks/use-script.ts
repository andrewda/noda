import { AircraftStateBoard } from "@/components/C2Panel";
import { useSocketEvent } from "@/lib/socket";
import { useEffect, useMemo, useState } from "react";

const kKmToNm = 0.539957;

export const useScript = (startTime: Date, config: any, spokenScriptEvents: string[], completedScriptEvents: string[], aircraft: Record<string, AircraftStateBoard>, globalTime: number) => {
  const { script: rawScript } = config ?? {};

  const [triggeredTime, setTriggeredTime] = useState<{ [id: string]: Date }>({});

  useEffect(() => {
    setTriggeredTime({});
  }, [startTime, config]);

  const compiledScript = useMemo(() => rawScript?.map((scriptItem: any) => ({
    ...scriptItem,
    id: crypto.randomUUID(),
  })), [rawScript]);

  const script = useMemo(() => compiledScript?.filter((scriptItem: any) => !completedScriptEvents.includes(scriptItem.id)), [compiledScript, completedScriptEvents]);

  const activeScript = useMemo(() => script?.filter((scriptItem: any) => {
    const { callsign: scriptCallsign, trigger } = scriptItem;

    const aircraftItem = aircraft[scriptCallsign];

    if (!aircraftItem) {
      return false;
    }

    if (trigger.type === 'time' && globalTime >= trigger.time) {
      return true
    }

    if (trigger.type === 'landed' && aircraftItem.flightPhase >= 10) {
      return true;
    }

    if (trigger.type === 'waypoint') {
      const triggerWaypointIndex = aircraftItem.flightPlan?.findIndex((waypoint) => waypoint === trigger.waypoint);

      if (triggerWaypointIndex === -1) {
        return true;
      }

      if (trigger.distance) {
        const distanceToWaypoint = aircraftItem.dist * kKmToNm;

        // If distance is negative, distance is before the trigger waypoint
        if (triggerWaypointIndex === aircraftItem.flightPlanIndex && trigger.distance < 0 && Math.abs(trigger.distance) >= distanceToWaypoint) {
          return true;
        }

        // If distance is positive, distance is after the trigger waypoint
        // TODO: need some way of tracking distance since passing waypoint... worth it?
        // if (triggerWaypointIndex === aircraftItem.flightPlanIndex + 1 && trigger.distance > 0 && TODO) {
        //   return true;
        // }

        // If we're more than one waypoint past the trigger waypoint, we've passed the trigger location
        if (triggerWaypointIndex <= aircraftItem.flightPlanIndex - 1) {
          return true;
        }
      } else if (triggerWaypointIndex < aircraftItem.flightPlanIndex) {
        return true;
      }
    }
  }).map((scriptItem: any) => {
    let triggerTime = triggeredTime?.[scriptItem.id];
    if (!triggerTime) {
      triggerTime = new Date();
      setTriggeredTime((prev) => ({ ...prev, [scriptItem.id]: triggerTime }));
    }

    return {
      ...scriptItem,
      triggerTime,
    };
  }).toSorted((a: any, b: any) => a.triggerTime.getTime() - b.triggerTime.getTime()), [script, triggeredTime, aircraft, globalTime]);

  return activeScript;
}
