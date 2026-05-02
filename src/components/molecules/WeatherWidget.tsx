import { getWeatherInfo, getWindDirection } from "../../utils/weather.utils";
import type { WeatherData } from "../../types/weather.types";
import { Wind, Droplets, Thermometer } from "lucide-react";

interface WeatherWidgetProps {
  weather: WeatherData;
}

export function WeatherWidget({ weather }: WeatherWidgetProps) {
  const info = getWeatherInfo(weather.weatherCode, weather.isDay);
  const windDir = getWindDirection(weather.windDirection);
  const Icon = info.icon;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <Icon className={`w-8 h-8 ${info.color}`} aria-hidden="true" />
        <div>
          <p className="text-foreground font-medium">{info.description}</p>
          <p className="text-2xl font-bold text-foreground">
            {weather.temperature}°C
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Thermometer className="w-3 h-3" aria-hidden="true" />
          <span>Feels {weather.apparentTemperature}°</span>
        </div>
        <div className="flex items-center gap-1">
          <Wind className="w-3 h-3" aria-hidden="true" />
          <span>
            {weather.windSpeed} km/h {windDir}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Droplets className="w-3 h-3" aria-hidden="true" />
          <span>{weather.humidity}%</span>
        </div>
      </div>
    </div>
  );
}
