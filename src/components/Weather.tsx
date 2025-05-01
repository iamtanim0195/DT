'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface WeatherData {
    location: string;
    temperature: number;
    conditions: string;
    humidity: number;
    windSpeed: number;
    windDeg: number;
    icon: string;
    feelsLike: number;
}

const Weather: React.FC<{ 
    lat: number; 
    lon: number;
    onWeatherUpdate?: (weather: WeatherData) => void;
}> = ({ lat, lon, onWeatherUpdate }) => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchWeather = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric`
            );

            if (!response.ok) {
                throw new Error(response.status === 401
                    ? 'Invalid API key'
                    : 'Weather data unavailable');
            }

            const data = await response.json();

            const weatherData = {
                location: data.name,
                temperature: Math.round(data.main.temp),
                conditions: data.weather[0].main,
                humidity: data.main.humidity,
                windSpeed: data.wind.speed,
                windDeg: data.wind.deg,
                icon: data.weather[0].icon,
                feelsLike: Math.round(data.main.feels_like),
            };

            setWeather(weatherData);
            if (onWeatherUpdate) {
                onWeatherUpdate(weatherData);
            }
        } catch (err) {
            console.error('Weather fetch failed:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [lat, lon, onWeatherUpdate]);

    useEffect(() => {
        fetchWeather();
        const interval = setInterval(fetchWeather, 600000); // Refresh every 10 mins
        return () => clearInterval(interval);
    }, [fetchWeather]);

    if (loading) return (
        <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl animate-pulse">
            <div className="h-6 w-32 mb-2 bg-gray-300/20 rounded"></div>
            <div className="h-4 w-24 bg-gray-300/20 rounded"></div>
        </div>
    );

    if (error) return (
        <div className="p-4 bg-red-500/10 backdrop-blur-sm rounded-xl text-red-300">
            <p>⚠️ {error}</p>
            <button
                onClick={fetchWeather}
                className="mt-2 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded transition"
            >
                Retry
            </button>
        </div>
    );

    if (!weather) return null;

    return (
        <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{weather.location}</h3>
                <span className="text-sm opacity-80">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>

            <div className="flex items-center gap-4">
                <img
                    src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                    alt={weather.conditions}
                    className="w-16 h-16"
                />

                <div>
                    <div className="text-3xl font-bold">{weather.temperature}°C</div>
                    <div className="text-sm opacity-80">Feels like {weather.feelsLike}°C</div>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex justify-between text-sm">
                    <span>💧 {weather.humidity}% Humidity</span>
                    <span>🌬️ {weather.windSpeed} m/s Wind</span>
                </div>
                <div className="mt-1 text-center capitalize text-sm opacity-90">
                    {weather.conditions}
                </div>
            </div>
        </div>
    );
};

export default Weather;