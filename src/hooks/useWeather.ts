import { useCallback, useEffect, useState } from "react";
import type { WeatherData } from "../types/weather.types";

const DUBLIN_LAT = 53.3498;
const DUBLIN_LON = -6.2603;

export function useWeather(pollInterval = 10 * 60 * 1000) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    try {
      const response = await window.fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${DUBLIN_LAT}&longitude=${DUBLIN_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,is_day&timezone=Europe%2FDublin`,
      );

      if (!response.ok) throw new Error("Weather fetch failed");

      const data = await response.json();
      setWeather({
        temperature: data.current.temperature_2m,
        apparentTemperature: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        weatherCode: data.current.weather_code,
        isDay: data.current.is_day === 1,
        precipitation: data.current.precipitation,
        cloudCover: data.current.cloud_cover,
      });
    } catch (e: any) {
      setError(e.message ?? "Weather unavailable");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, pollInterval);
    return () => clearInterval(id);
  }, [fetch, pollInterval]);

  return { weather, isLoading, error, refetch: fetch };
}
