import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
} from "lucide-react";

export interface WeatherInfo {
  description: string;
  icon: LucideIcon;
  color: string;
}

/**
 * Map a WMO weather code to a description, icon, and Tailwind text color.
 */
export function getWeatherInfo(code: number, _isDay?: boolean): WeatherInfo {
  const map: Record<number, WeatherInfo> = {
    0: { description: "Clear sky", icon: Sun, color: "text-yellow-400" },
    1: { description: "Mainly clear", icon: Sun, color: "text-yellow-400" },
    2: { description: "Partly cloudy", icon: Cloud, color: "text-gray-400" },
    3: { description: "Overcast", icon: Cloud, color: "text-gray-500" },
    45: { description: "Foggy", icon: CloudFog, color: "text-gray-400" },
    48: {
      description: "Depositing rime fog",
      icon: CloudFog,
      color: "text-gray-400",
    },
    51: {
      description: "Light drizzle",
      icon: CloudRain,
      color: "text-blue-400",
    },
    53: {
      description: "Moderate drizzle",
      icon: CloudRain,
      color: "text-blue-400",
    },
    55: {
      description: "Dense drizzle",
      icon: CloudRain,
      color: "text-blue-500",
    },
    61: { description: "Slight rain", icon: CloudRain, color: "text-blue-400" },
    63: {
      description: "Moderate rain",
      icon: CloudRain,
      color: "text-blue-500",
    },
    65: { description: "Heavy rain", icon: CloudRain, color: "text-blue-600" },
    66: {
      description: "Freezing rain",
      icon: CloudRain,
      color: "text-cyan-400",
    },
    67: {
      description: "Heavy freezing rain",
      icon: CloudRain,
      color: "text-cyan-500",
    },
    71: { description: "Slight snow", icon: CloudSnow, color: "text-white" },
    73: { description: "Moderate snow", icon: CloudSnow, color: "text-white" },
    75: { description: "Heavy snow", icon: CloudSnow, color: "text-white" },
    77: { description: "Snow grains", icon: CloudSnow, color: "text-white" },
    80: {
      description: "Slight rain showers",
      icon: CloudRain,
      color: "text-blue-400",
    },
    81: {
      description: "Moderate rain showers",
      icon: CloudRain,
      color: "text-blue-500",
    },
    82: {
      description: "Violent rain showers",
      icon: CloudRain,
      color: "text-blue-600",
    },
    85: {
      description: "Slight snow showers",
      icon: CloudSnow,
      color: "text-white",
    },
    86: {
      description: "Heavy snow showers",
      icon: CloudSnow,
      color: "text-white",
    },
    95: {
      description: "Thunderstorm",
      icon: CloudLightning,
      color: "text-yellow-500",
    },
    96: {
      description: "Thunderstorm with hail",
      icon: CloudLightning,
      color: "text-yellow-500",
    },
    99: {
      description: "Thunderstorm with heavy hail",
      icon: CloudLightning,
      color: "text-red-500",
    },
  };
  return (
    map[code] ?? { description: "Unknown", icon: Cloud, color: "text-gray-400" }
  );
}

/**
 * Convert wind direction degrees to a compass direction string.
 */
export function getWindDirection(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}
