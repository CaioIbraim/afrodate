"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

// Lista de locais populares
export const popularLocations = [
  { value: "restaurantes", label: "Restaurantes" },
  { value: "bares", label: "Bares" },
  { value: "cafes", label: "Cafés" },
  { value: "parques", label: "Parques" },
  { value: "museus", label: "Museus" },
  { value: "galerias", label: "Galerias de Arte" },
  { value: "cinemas", label: "Cinemas" },
  { value: "teatros", label: "Teatros" },
  { value: "shows", label: "Shows" },
  { value: "praias", label: "Praias" },
  { value: "shopping", label: "Shopping Centers" },
  { value: "livrarias", label: "Livrarias" },
  { value: "academias", label: "Academias" },
  { value: "clubes", label: "Clubes Noturnos" },
  { value: "festivais", label: "Festivais" },
  { value: "mercados", label: "Mercados/Feiras" },
  { value: "centros-culturais", label: "Centros Culturais" },
  { value: "natureza", label: "Áreas Naturais" },
  { value: "esportes", label: "Eventos Esportivos" },
  { value: "culinaria", label: "Experiências Culinárias" },
]

interface LocationSelectorProps {
  selectedLocations: string[]
  onChange: (locations: string[]) => void
  maxSelections?: number
  className?: string
}

export function LocationSelector({ selectedLocations, onChange, maxSelections = 5, className }: LocationSelectorProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (currentValue: string) => {
    if (selectedLocations.includes(currentValue)) {
      onChange(selectedLocations.filter((value) => value !== currentValue))
    } else {
      if (selectedLocations.length < maxSelections) {
        onChange([...selectedLocations, currentValue])
      }
    }
  }

  const handleRemove = (location: string) => {
    onChange(selectedLocations.filter((value) => value !== location))
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white border-oraculo-purple/30 text-oraculo-dark hover:bg-white hover:text-oraculo-purple"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Selecionar locais
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-white border-oraculo-purple/30">
          <Command className="bg-transparent">
            <CommandInput placeholder="Buscar local..." className="text-oraculo-dark" />
            <CommandList>
              <CommandEmpty className="text-oraculo-muted py-6 text-center">Nenhum local encontrado.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-y-auto">
                {popularLocations.map((location) => (
                  <CommandItem
                    key={location.value}
                    value={location.value}
                    onSelect={() => handleSelect(location.value)}
                    className="text-oraculo-dark hover:bg-oraculo-purple/10"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedLocations.includes(location.value) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {location.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLocations.map((location) => {
            const locationData = popularLocations.find((l) => l.value === location)
            return (
              <Badge
                key={location}
                className="bg-oraculo-purple/10 hover:bg-oraculo-purple/20 text-oraculo-purple border border-oraculo-purple/30"
                onClick={() => handleRemove(location)}
              >
                <MapPin className="h-3 w-3 mr-1" />
                {locationData?.label}
                <span className="sr-only">Remove</span>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

