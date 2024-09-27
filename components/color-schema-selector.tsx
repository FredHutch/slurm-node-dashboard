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
    colors: ["#4CAF50", "#FFA500", "#FF0000", "#1E90FF"],
  },
  {
    value: "vibrant",
    label: "Vibrant",
    colors: ["#00FF00", "#FF00FF", "#FFFF00", "#00FFFF"],
  },
  {
    value: "neon",
    label: "Neon",
    colors: ["#39FF14", "#FF10F0", "#FFF01F", "#00FFFF"],
  },
  {
    value: "earth",
    label: "Earth",
    colors: ["#8B4513", "#228B22", "#B8860B", "#20B2AA"],
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
