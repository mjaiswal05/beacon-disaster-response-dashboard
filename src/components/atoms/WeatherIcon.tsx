import { getWeatherInfo } from "../../utils/weather.utils";
import { cn } from "../ui/utils";

interface WeatherIconProps {
  weatherCode: number;
  isDay: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function WeatherIcon({
  weatherCode,
  isDay,
  size = "md",
}: WeatherIconProps) {
  const info = getWeatherInfo(weatherCode, isDay);
  const Icon = info.icon;

  return (
    <Icon
      className={cn(sizeMap[size], info.color)}
      aria-label={info.description}
    />
  );
}
