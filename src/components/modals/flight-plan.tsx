import { Badge } from "../ui/badge"

export interface FlightPlanModalProps {
  departureAirport: string | undefined;
  departureRunway: string | undefined;
  arrivalAirport: string | undefined;
  arrivalRunway: string | undefined;
  flightPlan: string[] | undefined;
  flightPlanIndex: number | undefined;
}

export const FlightPlanModal = ({ departureAirport, departureRunway, arrivalAirport, arrivalRunway, flightPlan, flightPlanIndex }: FlightPlanModalProps) => {
  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <h4 className="font-medium leading-none">Modify Flight Plan</h4>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1 w-full rounded-md border border-input bg-background px-2 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
          {([`${departureAirport} ${departureRunway}`, ...(flightPlan?.toSpliced(-2) ?? []), `${arrivalAirport} RW${arrivalRunway}`]).map((item, i) => (
            <div key={i} className="flex gap-2">
              <Badge className={flightPlanIndex === i - 1 ? 'bg-fuchsia-500 hover:bg-fuchsia-600 font-bold' : ''}>{item}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
