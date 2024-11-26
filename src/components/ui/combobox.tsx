"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  options: { label: string; value: string }[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string | undefined) => void;
}

export function Combobox({ label, options, value, defaultValue, onValueChange, ...props }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedValue, setSelectedValue] = React.useState<string | undefined>(undefined)

  React.useEffect(() => {
    setSelectedValue(value ?? defaultValue);
  }, [value, defaultValue]);

  return (
    <Popover open={open} onOpenChange={setOpen} {...props}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedValue
            ? options.find((options) => options.value === selectedValue)?.label
            : label }
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={label} />
          <CommandList>
            <CommandEmpty>Not found.</CommandEmpty>
            <CommandGroup>
              {options.map((options) => (
                <CommandItem
                  key={options.value}
                  value={options.value}
                  onSelect={(currentValue) => {
                    const newValue = currentValue === selectedValue ? undefined : currentValue;
                    setSelectedValue(newValue);
                    onValueChange?.(newValue);
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === options.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {options.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
