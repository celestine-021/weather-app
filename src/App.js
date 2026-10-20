import { useEffect, useMemo, useState } from "react";
import "./App.css";

const STARTING_CITIES = [
  {
    id: "new-york",
    name: "New York",
    country: "United States",
    countryCode: "US",
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    countryCode: "GB",
    latitude: 51.5072,
    longitude: -0.1276,
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    countryCode: "JP",
    latitude: 35.6762,
    longitude: 139.6503,
  },
  {
    id: "dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    countryCode: "AE",
    latitude: 25.2048,
    longitude: 55.2708,
  },
  {
    id: "reykjavik",
    name: "Reykjavik",
    country: "Iceland",
    countryCode: "IS",
    latitude: 64.1466,
    longitude: -21.9426,
  },
  {
    id: "sydney",
    name: "Sydney",
    country: "Australia",
    countryCode: "AU",
    latitude: -33.8688,
    longitude: 151.2093,
  },
  {
    id: "rio-de-janeiro",
    name: "Rio de Janeiro",
    country: "Brazil",
    countryCode: "BR",
    latitude: -22.9068,
    longitude: -43.1729,
  },
  {
    id: "nairobi",
    name: "Nairobi",
    country: "Kenya",
    countryCode: "KE",
    latitude: -1.2921,
    longitude: 36.8219,
  },
];

const WEATHER_CODES = {
  0: ["Clear sky", "☀️"],
  1: ["Mainly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Dense drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌧️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"],
  80: ["Rain showers", "🌦️"],
  81: ["Rain showers", "🌧️"],
  82: ["Heavy showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm & hail", "⛈️"],
  99: ["Thunderstorm & hail", "⛈️"],
};

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

function weatherForCode(code) {
  return WEATHER_CODES[code] || ["Conditions unavailable", "🌡️"];
}

function toFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  return String.fromCodePoint(
    ...countryCode
      .toUpperCase()
      .split("")
      .map((letter) => 127397 + letter.charCodeAt(0))
  );
}

function temperature(value, unit) {
  if (!Number.isFinite(value)) return "--";
  return Math.round(unit === "F" ? (value * 9) / 5 + 32 : value);
}

function formatDate(date, options, timeZone) {
  return new Intl.DateTimeFormat("en", { ...options, timeZone }).format(
    new Date(date)
  );
}

function formatClock(dateTime) {
  const [hours, minutes] = dateTime.slice(11, 16).split(":").map(Number);
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

async function fetchCityWeather(city) {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max",
    forecast_days: "5",
    timezone: "auto",
  });
  const response = await fetch(`${FORECAST_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Weather data is unavailable for ${city.name}.`);
  }
  return response.json();
}

function StatIcon({ children }) {
  return <span className="stat-icon" aria-hidden="true">{children}</span>;
}

function App() {
  const [cities, setCities] = useState(STARTING_CITIES);
  const [selectedId, setSelectedId] = useState(STARTING_CITIES[0].id);
  const [weatherByCity, setWeatherByCity] = useState({});
  const [loadingCities, setLoadingCities] = useState(true);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [unit, setUnit] = useState("C");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("weather-by-celestine-theme") === "dark"
  );

  useEffect(() => {
    localStorage.setItem(
      "weather-by-celestine-theme",
      isDarkMode ? "dark" : "light"
    );
  }, [isDarkMode]);

  useEffect(() => {
    let isCurrent = true;
    setLoadingCities(true);

    Promise.all(
      cities.map(async (city) => {
        try {
          const weather = await fetchCityWeather(city);
          return [city.id, { weather }];
        } catch (error) {
          return [
            city.id,
            {
              error:
                error instanceof Error
                  ? error.message
                  : `Could not load weather for ${city.name}.`,
            },
          ];
        }
      })
    ).then((results) => {
      if (!isCurrent) return;
      setWeatherByCity(Object.fromEntries(results));
      setLoadingCities(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [cities, refreshKey]);

  const selectedCity =
    cities.find((city) => city.id === selectedId) || cities[0];
  const selectedData = selectedCity && weatherByCity[selectedCity.id];
  const current = selectedData?.weather?.current;
  const daily = selectedData?.weather?.daily;
  const hourly = selectedData?.weather?.hourly;
  const [condition, conditionIcon] = weatherForCode(current?.weather_code);

  const upcomingHours = useMemo(() => {
    if (!hourly?.time?.length) return [];
    const currentTime = current?.time || "";
    const startIndex = Math.max(
      hourly.time.findIndex((time) => time >= currentTime),
      0
    );
    return hourly.time
      .slice(startIndex, startIndex + 8)
      .map((time, index) => ({
        time,
        temperature: hourly.temperature_2m[startIndex + index],
        precipitation: hourly.precipitation_probability[startIndex + index],
        weatherCode: hourly.weather_code[startIndex + index],
      }));
  }, [current?.time, hourly]);

  const submitSearch = async (event) => {
    event.preventDefault();
    const query = search.trim();
    if (!query) {
      setSearchError("Enter a city name to search.");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    try {
      const params = new URLSearchParams({
        name: query,
        count: "1",
        language: "en",
        format: "json",
      });
      const response = await fetch(`${GEOCODING_URL}?${params}`);
      if (!response.ok) throw new Error("City search is temporarily unavailable.");
      const data = await response.json();
      const result = data.results?.[0];
      if (!result) throw new Error(`No cities found for "${query}".`);

      const city = {
        id: `${result.latitude.toFixed(3)}-${result.longitude.toFixed(3)}`,
        name: result.name,
        country: result.country || "Unknown country",
        countryCode: result.country_code || "",
        latitude: result.latitude,
        longitude: result.longitude,
      };
      const existingCity = cities.find(
        (item) =>
          item.id === city.id ||
          (item.name.toLowerCase() === city.name.toLowerCase() &&
            item.countryCode === city.countryCode)
      );
      if (existingCity) {
        setSelectedId(existingCity.id);
      } else {
        setCities((existing) => [city, ...existing]);
        setSelectedId(city.id);
      }
      setSearch("");
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Could not search for that city."
      );
    } finally {
      setIsSearching(false);
    }
  };

  const refreshWeather = () => setRefreshKey((key) => key + 1);
  const now = new Date();

  return (
    <div className={`app-shell ${isDarkMode ? "theme-dark" : "theme-light"}`}>
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Weather by Celestine home">
          <span className="brand-mark">w</span>
          <span className="brand-name">weather by celestine</span>
        </a>

        <div className="sidebar-label">MENU</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#overview">
            <span className="nav-symbol">◫</span>
            Overview
          </a>
          <a className="nav-item" href="#world-cities">
            <span className="nav-symbol">◎</span>
            World cities
          </a>
          <button className="nav-item nav-button" onClick={refreshWeather}>
            <span className="nav-symbol">↻</span>
            Refresh data
          </button>
        </nav>

        <div className="sidebar-label locations-label">YOUR LOCATIONS</div>
        <div className="location-list">
          {cities.slice(0, 5).map((city) => (
            <button
              className={`location-item ${selectedId === city.id ? "selected" : ""}`}
              key={city.id}
              onClick={() => setSelectedId(city.id)}
            >
              <span>{toFlag(city.countryCode)}</span>
              <span className="location-name">{city.name}</span>
              {selectedId === city.id && <span className="location-dot" />}
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="source-chip"><span /> Live weather data</div>
          <p>Weather around the world, updated in real time.</p>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">w</span>
            <span className="brand-name">weather by celestine</span>
          </div>
          <div className="breadcrumb">Dashboard <span>/</span> Overview</div>
          <div className="topbar-right">
            <span className="live-status"><span /> LIVE</span>
            <span className="top-date">
              {formatDate(now, { weekday: "short", month: "short", day: "numeric" })}
            </span>
            <button
              className="theme-toggle"
              onClick={() => setIsDarkMode((darkMode) => !darkMode)}
              aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              aria-pressed={isDarkMode}
              title={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
            >
              <span aria-hidden="true">{isDarkMode ? "☀" : "☾"}</span>
              <span className="theme-toggle-label">
                {isDarkMode ? "Light" : "Dark"}
              </span>
            </button>
            <button
              className="unit-toggle"
              onClick={() => setUnit((currentUnit) => currentUnit === "C" ? "F" : "C")}
              aria-label={`Switch to degrees ${unit === "C" ? "Fahrenheit" : "Celsius"}`}
            >
              °{unit === "C" ? "C" : "F"}
              <span className="toggle-track"><span /></span>
              °{unit === "C" ? "F" : "C"}
            </button>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <p className="eyebrow">
              {formatDate(now, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              }).toUpperCase()}
            </p>
            <h1>Weather around the world<span>.</span></h1>
            <p className="heading-copy">A little sunshine, wherever you are.</p>
          </div>
          <form className="search-form" onSubmit={submitSearch}>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              aria-label="Search a city"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                if (searchError) setSearchError("");
              }}
              placeholder="Search any city..."
            />
            <button type="submit" disabled={isSearching}>
              {isSearching ? "Searching..." : "Search"}
            </button>
            {searchError && <span className="search-error" role="alert">{searchError}</span>}
          </form>
        </section>

        <section className="feature-grid" aria-label="Selected city weather">
          <article className="hero-card">
            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-content">
              <div className="hero-location">
                <span>{toFlag(selectedCity?.countryCode)}</span>
                <span>{selectedCity?.name}</span>
                <span className="hero-country">{selectedCity?.country}</span>
              </div>
              {current ? (
                <>
                  <div className="hero-temperature">
                    {temperature(current.temperature_2m, unit)}<sup>°{unit}</sup>
                  </div>
                  <p className="hero-condition">{condition}</p>
                  <p className="hero-feels">
                    Feels like {temperature(current.apparent_temperature, unit)}°
                  </p>
                  <div className="hero-divider" />
                  <div className="hero-sun">
                    <span>Sunrise <strong>{daily?.sunrise?.[0]?.slice(-5) || "--:--"}</strong></span>
                    <span className="sun-path"><i /></span>
                    <span>Sunset <strong>{daily?.sunset?.[0]?.slice(-5) || "--:--"}</strong></span>
                  </div>
                </>
              ) : (
                <div className="hero-loading">
                  {selectedData?.error || (loadingCities ? "Fetching live conditions..." : "Weather data unavailable.")}
                </div>
              )}
            </div>
            <div className="hero-weather-icon" aria-hidden="true">{conditionIcon}</div>
            <div className="hero-caption">
              <span className="caption-dot" /> CURRENT WEATHER
              <span className="caption-time">
                {current?.time
                  ? formatClock(current.time)
                  : "—"}
              </span>
            </div>
          </article>

          <article className="conditions-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">AT A GLANCE</p>
                <h2>Conditions</h2>
              </div>
              <span className="condition-badge">{current ? "NOW" : "—"}</span>
            </div>
            <div className="condition-list">
              <div className="condition-row">
                <StatIcon>◌</StatIcon>
                <span className="condition-name">Humidity</span>
                <strong>{current ? `${current.relative_humidity_2m}%` : "—"}</strong>
              </div>
              <div className="condition-row">
                <StatIcon>↗</StatIcon>
                <span className="condition-name">Wind</span>
                <strong>{current ? `${Math.round(current.wind_speed_10m)} <small>km/h</small>` : "—"}</strong>
              </div>
              <div className="condition-row">
                <StatIcon>◉</StatIcon>
                <span className="condition-name">Precipitation</span>
                <strong>{current ? `${current.precipitation} <small>mm</small>` : "—"}</strong>
              </div>
              <div className="condition-row">
                <StatIcon>⌁</StatIcon>
                <span className="condition-name">UV index</span>
                <strong>{daily?.uv_index_max?.[0] ?? "—"} <small>of 11</small></strong>
              </div>
            </div>
            <p className="condition-note">
              {current?.is_day ? "The sun is up in this part of the world." : current ? "Night has fallen in this part of the world." : "Live readings will appear here."}
            </p>
          </article>
        </section>

        <section className="hourly-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE NEXT FEW HOURS</p>
              <h2>Today&apos;s forecast</h2>
            </div>
            <span className="section-subtitle">{selectedCity?.name} local time</span>
          </div>
          <div className="hourly-card">
            {upcomingHours.length ? (
              <div className="hourly-list">
                {upcomingHours.map((hour, index) => (
                  <div className={`hour-item ${index === 0 ? "hour-current" : ""}`} key={hour.time}>
                    <span className="hour-time">
                      {index === 0 ? "Now" : formatClock(hour.time)}
                    </span>
                    <span className="hour-icon" aria-hidden="true">
                      {weatherForCode(hour.weatherCode)[1]}
                    </span>
                    <span className="hour-temp">{temperature(hour.temperature, unit)}°</span>
                    <span className="hour-rain">💧 {hour.precipitation ?? 0}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="hourly-empty">
                {loadingCities ? "Loading the hourly forecast..." : "Hourly forecast is not available right now."}
              </div>
            )}
          </div>
        </section>

        <section className="daily-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">COMING UP</p>
              <h2>5-day outlook</h2>
            </div>
            <span className="section-subtitle">{selectedCity?.name} local forecast</span>
          </div>
          <div className="daily-card">
            {daily?.time?.length ? (
              <div className="daily-list">
                {daily.time.map((date, index) => {
                  const [dayCondition, dayIcon] = weatherForCode(daily.weather_code[index]);
                  const dayName = new Intl.DateTimeFormat("en", {
                    weekday: "short",
                    timeZone: "UTC",
                  }).format(new Date(`${date}T12:00:00Z`));
                  return (
                    <div className="daily-item" key={date}>
                      <span className="daily-day">{index === 0 ? "Today" : dayName}</span>
                      <span className="daily-icon" role="img" aria-label={dayCondition}>{dayIcon}</span>
                      <span className="daily-range">
                        <strong>{temperature(daily.temperature_2m_max[index], unit)}°</strong>
                        <span>{temperature(daily.temperature_2m_min[index], unit)}°</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="hourly-empty">
                {loadingCities ? "Loading the daily forecast..." : "Daily forecast is not available right now."}
              </div>
            )}
          </div>
        </section>

        <section className="cities-section" id="world-cities">
          <div className="section-heading cities-heading">
            <div>
              <p className="eyebrow">A WORLD OF WEATHER</p>
              <h2>Explore cities <span className="city-count">{cities.length.toString().padStart(2, "0")}</span></h2>
            </div>
            <button className="refresh-button" onClick={refreshWeather} disabled={loadingCities}>
              <span className={loadingCities ? "refresh-spinning" : ""}>↻</span>
              {loadingCities ? "Updating" : "Refresh"}
            </button>
          </div>
          <div className="city-grid">
            {cities.map((city) => {
              const cityData = weatherByCity[city.id];
              const cityCurrent = cityData?.weather?.current;
              const [cityCondition, cityIcon] = weatherForCode(cityCurrent?.weather_code);
              return (
                <button
                  className={`city-card ${selectedId === city.id ? "city-selected" : ""}`}
                  key={city.id}
                  onClick={() => setSelectedId(city.id)}
                  aria-pressed={selectedId === city.id}
                >
                  <span className="city-card-top">
                    <span className="city-flag">{toFlag(city.countryCode)}</span>
                    <span className="city-select-indicator">{selectedId === city.id ? "●" : "↗"}</span>
                  </span>
                  <span className="city-name">{city.name}</span>
                  <span className="city-country">{city.country}</span>
                  {cityCurrent ? (
                    <>
                      <span className="city-weather">
                        <span className="city-icon" aria-hidden="true">{cityIcon}</span>
                        <span className="city-temp">{temperature(cityCurrent.temperature_2m, unit)}<sup>°</sup></span>
                      </span>
                      <span className="city-condition">{cityCondition}</span>
                    </>
                  ) : (
                    <span className="city-condition city-loading">
                      {cityData?.error ? "Data unavailable" : "Loading weather..."}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <footer className="page-footer">
          <span>Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></span>
          <span>Real conditions. All around the globe <span className="footer-sun">✳</span></span>
        </footer>
      </main>
    </div>
  );
}

export default App;
