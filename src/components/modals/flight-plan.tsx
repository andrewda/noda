import { Close } from "@radix-ui/react-popover";
import { useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

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
  const [flightPlanText, setFlightPlanText] = useState<string>((flightPlan ?? [])?.join(' ') ?? '');

  const compiledFlightPlan = useMemo(() => flightPlanText.split(' ').filter((item) => item !== ''), [flightPlanText]);

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Modify Flight Plan</h4>
      </div>
      <div className="flex flex-col gap-2">
        <Textarea className="resize-none" value={flightPlanText} onChange={(e) => setFlightPlanText(e.target.value)} />
        <div className="flex flex-wrap gap-1 w-full rounded-md border border-input/70 bg-background px-2 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          {([`${departureAirport} ${departureRunway}`, ...compiledFlightPlan, `${arrivalAirport} RW${arrivalRunway}`]).map((item, i) => (
            <div key={i} className="flex gap-2">
              <Badge className={`cursor-pointer ${flightPlanIndex === i - 1 ? 'bg-fuchsia-600 hover:bg-fuchsia-600/90 font-bold' : 'bg-primary/60 hover:bg-primary/50'}`}>{item}</Badge>
            </div>
          ))}
        </div>
        <div className="flex gap-2 w-full">
          <Close asChild>
            <Button className="w-full" variant="outline">Cancel</Button>
          </Close>
          <Close asChild>
            <Button className="w-full" onClick={() => onModify}>Modify</Button>
          </Close>
        </div>
      </div>
    </div>
  )
}
