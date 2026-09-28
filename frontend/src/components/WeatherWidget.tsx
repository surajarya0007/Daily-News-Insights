'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Droplets,
  Wind,
  Thermometer,
  Eye,
  Search,
  MapPin,
  Loader2,
  X,
  RefreshCw,
  SunDim,
  Moon,
  CloudSun,
  CloudFog,
  Calendar,
  Compass
} from 'lucide-react';

interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
}

interface ForecastHour {
  time: string;
  temp: number;
  icon: string;
  precipProb: number;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  condition: string;
  icon: string;
  city: string;
  uvIndex: number;
  pressure: number;
  precipProb: number;
  hourly: ForecastHour[];
  daily: ForecastDay[];
}

const MOCK_WEATHER: WeatherData = {
  temp: 34,
  feelsLike: 38,
  humidity: 62,
  windSpeed: 14,
  visibility: 8,
  condition: 'Partly Cloudy',
  icon: 'cloud-sun',
  city: 'New Delhi',
  uvIndex: 8,
  pressure: 1008,
  precipProb: 20,
  hourly: Array.from({ length: 6 }).map((_, i) => ({
    time: `${(new Date().getHours() + i) % 24}:00`,
    temp: 34 - Math.floor(i / 2),
    icon: 'cloud-sun',
    precipProb: 20 + i * 5,
  })),
  daily: Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });
    return {
      date: i === 0 ? 'Today' : dayName,
      tempMax: 35 - Math.floor(i / 3),
      tempMin: 26 + Math.floor(i / 4),
      condition: 'Partly Cloudy',
      icon: 'cloud-sun',
    };
  }),
};

function mapWeatherCode(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: 'Clear Sky', icon: 'sun' };
  if (code >= 1 && code <= 3) return { condition: 'Partly Cloudy', icon: 'cloud-sun' };
  if (code === 45 || code === 48) return { condition: 'Foggy', icon: 'cloud-fog' };
  if (code >= 51 && code <= 67) return { condition: 'Rainy', icon: 'cloud-rain' };
  if (code >= 71 && code <= 77) return { condition: 'Snowy', icon: 'cloud-snow' };
  if (code >= 80 && code <= 82) return { condition: 'Showers', icon: 'cloud-rain' };
  if (code >= 95) return { condition: 'Thunderstorm', icon: 'cloud-lightning' };
  return { condition: 'Cloudy', icon: 'cloud' };
}

function getWeatherIcon(icon: string, size: number = 16, styleOverride = {}) {
  const style = { width: size, height: size, ...styleOverride };
  switch (icon) {
    case 'sun': return <Sun style={style} />;
    case 'moon': return <Moon style={style} />;
    case 'cloud-sun': return <CloudSun style={style} />;
    case 'cloud-rain': return <CloudRain style={style} />;
    case 'cloud-snow': return <CloudSnow style={style} />;
    case 'cloud-lightning': return <CloudLightning style={style} />;
    case 'cloud-fog': return <CloudFog style={style} />;
    default: return <Cloud style={style} />;
  }
}

function getWeatherGradient(icon: string) {
  switch (icon) {
    case 'sun':
      return 'linear-gradient(135deg, #f57c00 0%, #d84315 100%)';
    case 'cloud-sun':
      return 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)';
    case 'cloud-rain':
    case 'cloud-lightning':
      return 'linear-gradient(135deg, #37474f 0%, #212121 100%)';
    case 'cloud-snow':
      return 'linear-gradient(135deg, #00acc1 0%, #006064 100%)';
    case 'cloud-fog':
      return 'linear-gradient(135deg, #78909c 0%, #455a64 100%)';
    default:
      return 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)';
  }
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData>(MOCK_WEATHER);
  const [popupOpen, setPopupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCustomLoc, setIsCustomLoc] = useState(false);
  const [isCelsius, setIsCelsius] = useState<boolean>(true);
  const [recentCities, setRecentCities] = useState<{ city: string; lat: number; lon: number }[]>([]);


  const [activeCoords, setActiveCoords] = useState<{ lat: number; lon: number; city: string }>({
    lat: 28.6139,
    lon: 77.2090,
    city: 'New Delhi'
  });
  
  const ref = useRef<HTMLDivElement>(null);

  const addToRecentCities = (city: string, lat: number, lon: number) => {
    setRecentCities(prev => {
      const filtered = prev.filter(c => c.city.toLowerCase() !== city.toLowerCase());
      const next = [{ city, lat, lon }, ...filtered].slice(0, 4); // Keep last 4
      localStorage.setItem('weather_recent_cities', JSON.stringify(next));
      return next;
    });
  };

  const convertTemp = useCallback((c: number) => {
    if (isCelsius) return `${c}°C`;
    return `${Math.round((c * 9) / 5 + 32)}°F`;
  }, [isCelsius]);

  const toggleUnit = () => {
    setIsCelsius(prev => {
      const next = !prev;
      localStorage.setItem('weather_is_celsius', String(next));
      return next;
    });
  };

  // Helper to fetch weather for a specific latitude, longitude, and city name
  const fetchWeatherForCoords = async (lat: number, lon: number, city: string) => {
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,weathercode,precipitation_probability,visibility,pressure_msl,uv_index&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        const current = weatherData.current_weather;
        
        let index = 0;
        const now = new Date();
        const currentHourStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:00`;
        
        if (weatherData.hourly?.time) {
          const matchedIndex = weatherData.hourly.time.indexOf(currentHourStr);
          if (matchedIndex !== -1) {
            index = matchedIndex;
          } else {
            index = now.getHours();
          }
        }

        const { condition, icon } = mapWeatherCode(current.weathercode);
        
        // Parse hourly forecast (next 6 hours starting from now)
        const hourlyForecasts: ForecastHour[] = [];
        if (weatherData.hourly) {
          const times = weatherData.hourly.time || [];
          const temps = weatherData.hourly.temperature_2m || [];
          const codes = weatherData.hourly.weathercode || [];
          const precipProbs = weatherData.hourly.precipitation_probability || [];
          
          for (let i = 0; i < 6; i++) {
            const hIndex = index + i;
            if (hIndex < times.length) {
              const dateObj = new Date(times[hIndex]);
              const timeStr = dateObj.toLocaleTimeString('en-US', {
                hour: 'numeric',
                hour12: true,
              });
              const { icon: hIcon } = mapWeatherCode(codes[hIndex]);
              hourlyForecasts.push({
                time: timeStr,
                temp: Math.round(temps[hIndex]),
                icon: hIcon,
                precipProb: precipProbs[hIndex] || 0,
              });
            }
          }
        }

        // Parse 7-day forecast
        const dailyForecasts: ForecastDay[] = [];
        if (weatherData.daily) {
          const times = weatherData.daily.time || [];
          const codes = weatherData.daily.weathercode || [];
          const maxTemps = weatherData.daily.temperature_2m_max || [];
          const minTemps = weatherData.daily.temperature_2m_min || [];
          
          for (let i = 0; i < 7; i++) {
            if (i < times.length) {
              const d = new Date(times[i]);
              const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
              const { condition: dCondition, icon: dIcon } = mapWeatherCode(codes[i]);
              dailyForecasts.push({
                date: i === 0 ? 'Today' : dayName,
                tempMax: Math.round(maxTemps[i]),
                tempMin: Math.round(minTemps[i]),
                condition: dCondition,
                icon: dIcon,
              });
            }
          }
        }

        setActiveCoords({ lat, lon, city });

        setWeather({
          temp: Math.round(current.temperature),
          feelsLike: Math.round(current.temperature),
          humidity: weatherData.hourly?.relativehumidity_2m?.[index] ?? 62,
          windSpeed: Math.round(current.windspeed),
          visibility: Math.round((weatherData.hourly?.visibility?.[index] ?? 10000) / 1000),
          condition,
          icon,
          city,
          uvIndex: Math.round(weatherData.hourly?.uv_index?.[index] ?? 5),
          pressure: Math.round(weatherData.hourly?.pressure_msl?.[index] ?? 1013),
          precipProb: weatherData.hourly?.precipitation_probability?.[index] ?? 0,
          hourly: hourlyForecasts.length > 0 ? hourlyForecasts : MOCK_WEATHER.hourly,
          daily: dailyForecasts.length > 0 ? dailyForecasts : MOCK_WEATHER.daily,
        });
      }
    } catch (err) {
      console.error('Error fetching weather data:', err);
    }
  };

  // Helper to run IP Geolocation detection
  const fetchLocalWeather = async (forceHTML5: boolean = false) => {
    let lat = 28.6139; // Delhi coordinates
    let lon = 77.2090;
    let city = 'New Delhi';

    // Helper to get from backend IP proxy
    const getIPLocation = async () => {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL ||
          (process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : '');
        const locRes = await fetch(`${API_URL}/api/location`);
        if (locRes.ok) {
          const locData = await locRes.json();
          if (locData.success) {
            return {
              lat: locData.latitude || 28.6139,
              lon: locData.longitude || 77.2090,
              city: locData.city || 'New Delhi'
            };
          }
        }
      } catch (err) {
        console.error('Backend location lookup failed:', err);
      }
      return null;
    };

    // Try HTML5 geolocation first (fast, accurate) if supported and explicitly requested by user
    if (forceHTML5 && typeof window !== 'undefined' && navigator.geolocation) {
      const getPosition = () => {
        return new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 0 // Fetch fresh coordinates instead of cached ones
          });
        });
      };

      try {
        const position = await getPosition();
        lat = position.coords.latitude;
        lon = position.coords.longitude;
        
        city = "Your Location";
        try {
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            city = revData.city || revData.locality || revData.principalSubdivision || "Your Location";
          }
        } catch (revErr) {
          console.warn("Reverse geocode failed, using default label", revErr);
        }
        await fetchWeatherForCoords(lat, lon, city);
        return;
      } catch (geoErr) {
        console.log('HTML5 Geolocation denied/failed, falling back to IP Geolocation proxy.');
      }
    }

    // IP Geolocation Fallback via backend proxy (to avoid CORS)
    const ipLoc = await getIPLocation();
    if (ipLoc) {
      lat = ipLoc.lat;
      lon = ipLoc.lon;
      city = ipLoc.city;
    }

    await fetchWeatherForCoords(lat, lon, city);
  };

  useEffect(() => {
    // Load unit preference and recent cities on client mount
    if (typeof window !== 'undefined') {
      const savedUnit = localStorage.getItem('weather_is_celsius');
      if (savedUnit === 'false') {
        setIsCelsius(false);
      }
      const stored = localStorage.getItem('weather_recent_cities');
      if (stored) {
        try {
          setRecentCities(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }

    const initializeLocationAndWeather = async () => {
      const savedLoc = localStorage.getItem('weather_custom_location');
      if (savedLoc) {
        try {
          const parsed = JSON.parse(savedLoc);
          if (parsed.lat && parsed.lon && parsed.city) {
            setIsCustomLoc(true);
            await fetchWeatherForCoords(parsed.lat, parsed.lon, parsed.city);
            return;
          }
        } catch (e) {
          console.error('Failed to parse cached weather location:', e);
        }
      }
      await fetchLocalWeather();
    };

    initializeLocationAndWeather();
  }, []);

  // Handle City Search
  const handleSearch = async (targetQuery?: string) => {
    const query = targetQuery || searchQuery;
    if (!query.trim()) return;
    setLoadingSearch(true);
    setErrorMsg('');
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=1&language=en&format=json`
      );
      if (!res.ok) throw new Error('Geocoding request failed');
      const data = await res.json();
      if (!data.results || data.results.length === 0) {
        setErrorMsg('City not found');
        return;
      }
      const result = data.results[0];
      const newLoc = {
        city: result.name,
        lat: result.latitude,
        lon: result.longitude,
      };
      localStorage.setItem('weather_custom_location', JSON.stringify(newLoc));
      setIsCustomLoc(true);
      setSearchQuery('');
      addToRecentCities(newLoc.city, newLoc.lat, newLoc.lon);
      await fetchWeatherForCoords(newLoc.lat, newLoc.lon, newLoc.city);
    } catch (err) {
      console.error(err);
      setErrorMsg('Search failed. Try again.');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Handle Manual Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchWeatherForCoords(activeCoords.lat, activeCoords.lon, activeCoords.city);
    } finally {
      setRefreshing(false);
    }
  };

  // Detect current location (clear custom)
  const handleDetectLocation = async () => {
    localStorage.removeItem('weather_custom_location');
    setIsCustomLoc(false);
    setErrorMsg('');
    await fetchLocalWeather(true);
  };

  // Close popup on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPopupOpen(false);
      }
    }
    if (popupOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [popupOpen]);

  return (
    <div ref={ref} style={{ display: 'inline-flex' }}>
      {/* Inline Display in Header */}
      <button
        onClick={() => setPopupOpen(!popupOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          fontSize: 13,
          fontWeight: 600,
          padding: '6px 12px',
          minHeight: 44,
          borderRadius: 4,
          transition: 'background 0.15s',
          fontFamily: 'var(--font-sans)',
        }}
        title="Click for weather details"
        aria-label="Weather details"
      >
        {getWeatherIcon(weather.icon, 16)}
        <span>{convertTemp(weather.temp)}</span>
        <span style={{ opacity: 0.6 }} className="hide-mobile">{weather.city}</span>
      </button>

      {/* Blurred Backdrop */}
      {popupOpen && (
        <div
          onClick={() => setPopupOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 998,
          }}
        />
      )}

      {/* Center Modal Dialog */}
      <div className={`weather-popup ${popupOpen ? 'open' : ''}`}>
        {/* Dynamic Gradient Header Card */}
        <div style={{
          background: getWeatherGradient(weather.icon),
          color: '#ffffff',
          padding: '28px 24px',
          position: 'relative',
          borderRadius: '15px 15px 0 0',
        }}>
          {/* Close Button */}
          <button
            onClick={() => setPopupOpen(false)}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              cursor: 'pointer',
              color: '#ffffff',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
            title="Close dialog"
            aria-label="Close dialog"
          >
            <X style={{ width: 16, height: 16 }} />
          </button>

          {/* Refresh & Unit Toggle Bar */}
          <div style={{ display: 'flex', gap: 8, position: 'absolute', top: 16, left: 16 }}>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                cursor: 'pointer',
                color: '#ffffff',
                width: 44,
                height: 44,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              title="Refresh weather"
              aria-label="Refresh weather"
            >
              <RefreshCw style={{ width: 12, height: 12, animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button
              onClick={toggleUnit}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                cursor: 'pointer',
                color: '#ffffff',
                minWidth: 44,
                minHeight: 44,
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              title={`Switch to ${isCelsius ? 'Fahrenheit' : 'Celsius'}`}
              aria-label="Toggle temperature unit"
            >
              {isCelsius ? '°F' : '°C'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
              {getWeatherIcon(weather.icon, 52, { filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.15))' })}
              <span style={{ fontSize: 54, fontWeight: 900, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.15)', fontFamily: 'var(--font-sans)' }}>
                {convertTemp(weather.temp)}
              </span>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '8px 0 2px 0', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
              {weather.city}
            </h2>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {weather.condition}
            </div>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {/* Location Search & Auto Detect Input */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Search city (e.g. Mumbai, New York)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                style={{
                  width: '100%',
                  padding: '8px 36px 8px 12px',
                  fontSize: 13,
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 8,
                  color: 'var(--color-ink)',
                  outline: 'none',
                  fontFamily: 'var(--font-sans)',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={() => handleSearch()}
                disabled={loadingSearch}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 44,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-ink-muted)',
                }}
                title="Search city"
                aria-label="Search city"
              >
                {loadingSearch ? (
                  <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Search style={{ width: 14, height: 14 }} />
                )}
              </button>
            </div>
            {/* Auto Detect Location */}
            <button
              onClick={handleDetectLocation}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                background: isCustomLoc ? 'var(--bg-tertiary)' : 'var(--ir-crimson-bg)',
                border: '1px solid var(--border-primary)',
                borderRadius: 8,
                cursor: 'pointer',
                color: isCustomLoc ? 'var(--color-ink-muted)' : 'var(--ir-crimson)',
                flexShrink: 0
              }}
              title="Detect my current location"
              aria-label="Detect current location"
            >
              <MapPin style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {errorMsg && (
            <div style={{ fontSize: 12, color: 'var(--ir-crimson)', marginBottom: 12, textAlign: 'left', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          {/* Recent Cities Bar */}
          {recentCities.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-ink-faint)', letterSpacing: '0.04em' }}>Recents:</span>
              {recentCities.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSearch(c.city)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 12,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--color-ink-secondary)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--border-primary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                >
                  {c.city}
                </button>
              ))}
            </div>
          )}

          {/* 3x2 Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 20,
            borderBottom: '1px solid var(--border-primary)',
            paddingBottom: 20
          }}>
            {[
              { icon: <Thermometer style={{ width: 16, height: 16 }} />, label: 'Feels Like', value: convertTemp(weather.feelsLike) },
              { icon: <Droplets style={{ width: 16, height: 16 }} />, label: 'Humidity', value: `${weather.humidity}%` },
              { icon: <Wind style={{ width: 16, height: 16 }} />, label: 'Wind Speed', value: `${weather.windSpeed} km/h` },
              { icon: <Eye style={{ width: 16, height: 16 }} />, label: 'Visibility', value: `${weather.visibility} km` },
              { icon: <SunDim style={{ width: 16, height: 16 }} />, label: 'UV Index', value: `${weather.uvIndex} (Moderate)` },
              { icon: <Compass style={{ width: 16, height: 16 }} />, label: 'Pressure', value: `${weather.pressure} hPa` },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'var(--bg-secondary)',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-secondary)'
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: 'var(--bg-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ir-crimson)',
                  flexShrink: 0
                }}>
                  {item.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-ink)' }}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Hourly Forecast */}
          <div style={{ marginBottom: 20, borderBottom: '1px solid var(--border-primary)', paddingBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <RefreshCw style={{ width: 14, height: 14, color: 'var(--color-ink-faint)' }} />
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink)', letterSpacing: '0.08em' }}>Hourly Forecast</span>
            </div>
            <div className="weather-hourly-scroll" style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 8,
            }}>
              {weather.hourly.map((h, i) => (
                <div key={i} style={{
                  flex: '0 0 76px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-secondary)',
                  borderRadius: 8,
                  padding: '8px 4px',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-muted)' }}>{h.time}</span>
                  <div style={{ margin: '6px 0', color: 'var(--ir-crimson)' }}>
                    {getWeatherIcon(h.icon, 20)}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-ink)' }}>{convertTemp(h.temp)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 12, fontWeight: 700, color: '#0284c7', marginTop: 4 }}>
                    <Droplets style={{ width: 8, height: 8 }} />
                    <span>{h.precipProb}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7-Day Forecast */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Calendar style={{ width: 14, height: 14, color: 'var(--color-ink-faint)' }} />
              <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-ink)', letterSpacing: '0.08em' }}>7-Day Forecast</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {weather.daily.map((day, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-secondary)',
                  borderRadius: 8,
                  padding: '8px 14px'
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink)', width: 60 }}>{day.date}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 130 }}>
                    <div style={{ color: 'var(--ir-crimson)' }}>
                      {getWeatherIcon(day.icon, 18)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-muted)' }}>{day.condition}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', width: 90 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-ink-faint)' }}>{convertTemp(day.tempMin)}</span>
                    <div style={{ width: 40, height: 4, background: 'var(--border-primary)', borderRadius: 2, position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: '20%',
                        right: '15%',
                        height: '100%',
                        background: 'var(--ir-crimson)',
                        borderRadius: 2
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-ink)' }}>{convertTemp(day.tempMax)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
