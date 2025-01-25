import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Paintbrush2Icon } from "lucide-react";

interface ColorSchemaOption {
  value: string;
  label: string;
  colors: string[];
}

const colorSchemaOptions: ColorSchemaOption[] = [
  {
    value: "default",
    label: "Default",
    colors: [
      "#60a5fa", // bg-blue-400 (DRAIN/DOWN)
      "#047857", // bg-green-700 (IDLE)
      "#9333ea", // bg-indigo-500 (PLANNED)
      "#7c2d12", // bg-red-900 (ALLOCATED)
    ],
  },
  {
    value: "semantic",
    label: "Semantic",
    colors: [
      "#b91c1c", // bg-red-700 (DOWN)
      "#0369a1", // bg-blue-700 (ALLOCATED)
      "#059669", // bg-emerald-600 (IDLE)
      "#9333ea", // bg-purple-600 (PLANNED)
    ],
  },
  {
    value: "modern",
    label: "Modern",
    colors: [
      "#e11d48", // bg-rose-700 (DOWN)
      "#0284c7", // bg-sky-700 (ALLOCATED)
      "#0d9488", // bg-teal-600 (IDLE)
      "#4f46e5", // bg-indigo-600 (PLANNED)
    ],
  },
  {
    value: "contrast",
    label: "Contrast",
    colors: [
      "#7f1d1d", // bg-red-900 (DOWN)
      "#1e3a8a", // bg-blue-900 (ALLOCATED)
      "#065f46", // bg-emerald-800 (IDLE)
      "#581c87", // bg-purple-800 (PLANNED)
    ],
  },
  {
    value: "soft",
    label: "Soft",
    colors: [
      "#ef4444", // bg-red-500 (DOWN)
      "#3b82f6", // bg-blue-500 (ALLOCATED)
      "#10b981", // bg-emerald-500 (IDLE)
      "#a855f7", // bg-purple-500 (PLANNED)
    ],
  },
];

interface ColorSchemaSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const ColorSchemaSelector: React.FC<ColorSchemaSelectorProps> = ({
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (newValue: string) => {
    onChange(newValue);
    setIsOpen(false);
  };

  const currentSchema =
    colorSchemaOptions.find((option) => option.value === value) ||
    colorSchemaOptions[0];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9 p-0">
          <Paintbrush2Icon className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1">
        <div className="space-y-1">
          {colorSchemaOptions.map((option) => (
            <Button
              key={option.value}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => handleSelect(option.value)}
            >
              <div className="flex items-center space-x-2 w-full">
                <div className="flex space-x-1">
                  {option.colors.map((color, index) => (
                    <div
                      key={index}
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-xs flex-grow">{option.label}</span>
              </div>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ColorSchemaSelector;
