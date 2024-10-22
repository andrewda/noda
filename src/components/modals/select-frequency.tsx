import { Badge } from "../ui/badge"
import { Combobox } from "../ui/combobox";
import { Input } from "../ui/input";

export interface SelectFrequencyModalProps  {
  frequency: string | undefined;
}

export const SelectFrequencyModal = ({ frequency }: SelectFrequencyModalProps) => {
  return (
    <div className="grid gap-4">
      {/* <div className="space-y-2">
        <h4 className="font-medium leading-none">Select Approach ({arrivalAirport})</h4>
      </div> */}
      <div className="flex flex-col gap-2">
        <Input className="w-full" value={frequency} />
      </div>
    </div>
  )
}
