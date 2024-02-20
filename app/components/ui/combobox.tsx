
import { ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import * as React from "react";

import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export function ComboboxDemo({
  placeholder,
  values,
  value,
  setValue,
  texts,
}: {
  placeholder: string;
  values: string[];
  value: string;
  setValue: (value: string) => void;
  texts?: {
    chunk_id: string;
    text: string;
  }[];
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between overflow-x-scroll capitalize"
        >
          {value ? value : placeholder}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Buscar..." className="h-9" />
          <CommandEmpty>Nada seleccionado</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-scroll">
            {values.map((usableValue) => (
              <CommandItem
                className="flex w-full items-center justify-between capitalize"
                key={usableValue}
                value={usableValue}
                onSelect={() => {
                  setValue(usableValue);
                  setOpen(false);
                }}
              >
                <div>{usableValue}</div>
                {texts &&
                  texts.find((text) => text.chunk_id.endsWith(usableValue)) && (
                    <div className="flex flex-col justify-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <SearchIcon className="rounded ml-auto h-5 w-5 p-1 hover:bg-slate-200" />
                        </TooltipTrigger>
                        <TooltipContent className="max-h-[300px] max-w-[300px] overflow-scroll">
                          {
                            texts.find((text) =>
                              text.chunk_id.endsWith(usableValue),
                            )?.text
                          }
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
