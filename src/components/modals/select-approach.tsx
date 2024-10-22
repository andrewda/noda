import { Badge } from "../ui/badge"
import { Combobox } from "../ui/combobox";

export interface FlightPlanModalProps  {
  arrivalAirport: string | undefined;
  arrivalRunway: string | undefined;
  approaches: string[];
}

export const SelectApproachModal = ({ arrivalAirport, arrivalRunway, approaches }: FlightPlanModalProps) => {
  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Select Approach ({arrivalAirport})</h4>
      </div>
      <div className="flex flex-col gap-2">
        <Combobox className="w-full" label="Select approach..." options={[{ label: 'Approach 1', value: 'approach1' }, { label: 'Approach 2', value: 'approach2' }]} />
      </div>
    </div>
  )
}
