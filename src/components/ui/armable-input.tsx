import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function ArmableInput({ ...props }) {
  const { labelText, armText, unit, onArm, disabled, armDisabled, ...inputProps } = props;

  return (
    <div className="w-full items-center gap-1.5">
      <Label htmlFor="input">{labelText}</Label>
      <div className="flex w-full items-center space-x-2">
        <div className="flex-1 relative">
          <Input id="input" className="w-full" disabled={disabled} {...inputProps} />
          <span className="absolute right-4 top-1/2 translate-y-[-50%] select-none pointer-events-none">{unit}</span>
        </div>
        <Button type="submit" className="min-w-32" disabled={disabled || armDisabled} onClick={onArm ?? (() => {})}>{armText}</Button>
      </div>
    </div>
  )
}
