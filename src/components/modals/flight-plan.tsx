import { Close } from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Combobox } from "../ui/combobox";

export interface FlightPlanModalProps {
  departureAirport: string | undefined;
  departureRunway: string | undefined;
  arrivalAirport: string | undefined;
  arrivalRunway: string | undefined;
  flightPlan: string[] | undefined;
  flightPlanIndex: number | undefined;
  onModify: (newFlightPlan: string[]) => void;
}

export const FlightPlanModal = ({ departureAirport, departureRunway, arrivalAirport, arrivalRunway, flightPlan, flightPlanIndex, onModify }: FlightPlanModalProps) => {
  // TODO: this should only accept the enroute flight plan, not the full flight plan
  const [flightPlanText, setFlightPlanText] = useState<string>((flightPlan ?? [])?.join(' ') ?? '');

  const compiledFlightPlan = useMemo(() => flightPlanText.split(' ').filter((item) => item !== ''), [flightPlanText]);

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Modify Flight Plan</h4>
      </div>
      <div className="flex flex-col gap-2">
        <Textarea className="resize-none" value={flightPlanText} rows={3} onChange={(e) => setFlightPlanText(e.target.value)} />
        <div className="flex w-full">
          <Combobox className="w-full" label="Select approach..." options={[{ label: 'Approach 1', value: 'approach1' }, { label: 'Approach 2', value: 'approach2' }]} />
        </div>
        <div className="flex gap-2 w-full mt-4">
          <Close asChild>
            <Button className="w-full" variant="outline">Cancel</Button>
          </Close>
          <Close asChild>
            <Button className="w-full" onClick={() => onModify(compiledFlightPlan)}>Modify</Button>
          </Close>
        </div>
      </div>
    </div>
  )
}
