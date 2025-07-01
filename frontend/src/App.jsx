import React, { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Loader from "./Loader";

const App = () => {
  const [cityInput, setCityInput] = useState("");
  const [weather, setWeather] = useState({});
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState({
    forecast: [],
    historyOptions: ["Past 1 Hour", "Past 5 Hours", "Past 1 Day"],
  });

  const socketRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    // socketRef.current = new WebSocket("ws://localhost:5000");

    socketRef.current = new WebSocket(
      "wss://weather-backend-gmp7.onrender.com"
    );
    // socketRef.current = new WebSocket(import.meta.env.VITE_WS_URL);

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWeather(data);
      setCurrent((prev) => ({
        ...prev,
        forecast: data.forecast || [],
      }));
      setLoading(false);
    };

    return () => {
      socketRef.current.close();
    };
  }, []);

  const forecastGraphData = weather.forecastGraphData || [];

  const handleCitySubmit = (e) => {
    e.preventDefault();
    if (cityInput.trim() && socketRef.current?.readyState === WebSocket.OPEN) {
      setLoading(true);
      socketRef.current.send(JSON.stringify({ type: "city", city: cityInput }));
      setCityInput("");
    }
  };

  const handleDownload = (type) => {
    const now = new Date();
    const records = [];
    const header = ["Time", "Temperature (°C)", "Humidity (%)", "City"];

    for (
      let i = 0;
      i < (type === "Past 1 Hour" ? 1 : type === "Past 5 Hours" ? 5 : 24);
      i++
    ) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      records.push([
        timestamp.toLocaleString(),
        weather.temp || 0,
        weather.humidity || 0,
        weather.city || "N/A",
      ]);
    }

    const csvContent = [header.join(",")]
      .concat(records.map((r) => r.join(",")))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${weather.city || "weather"}-${type.replace(
      /\s/g,
      "_"
    )}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-blue-950 text-white p-6 flex flex-col gap-8 relative">
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center z-50">
          <Loader />
          <p className="text-2xl mt-4">Getting data please wait...</p>
        </div>
      )}

      <form
        onSubmit={handleCitySubmit}
        className="flex justify-center items-center gap-4 mb-6"
      >
        <input
          type="text"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          placeholder="Enter city name"
          className="px-4 py-2 rounded-md text-white border-1"
        />
        <button
          type="submit"
          className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-md cursor-pointer"
        >
          Get Weather
        </button>
      </form>

      <div className="max-w-6xl mx-auto w-full">
        <div className="bg-blue-950 bg-opacity-60 backdrop-blur-md rounded-xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 text-center shadow-xl border border-blue-600">
          <div>
            <p className="text-lg font-semibold">🌡️ Temperature</p>
            <p className="text-3xl font-bold">{weather.temp || 0}°C</p>
          </div>
          <div>
            <p className="text-lg font-semibold">💧 Humidity</p>
            <p className="text-3xl font-bold">{weather.humidity || 0}%</p>
          </div>
          <div>
            <p className="text-lg font-semibold">🌬️ Wind Speed</p>
            <p className="text-3xl font-bold">{weather.wind || 0} km/h</p>
          </div>
          <div>
            <p className="text-lg font-semibold">📍 City</p>
            <p className="text-3xl font-bold">{weather.city || "N/A"}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full">
        <div className="bg-blue-950 bg-opacity-60 backdrop-blur-md rounded-xl p-6 border border-blue-600 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">🗓️ Live Forecast</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {current.forecast.map((f, i) => (
              <div
                key={i}
                className="bg-blue-800 bg-opacity-80 p-4 rounded-lg text-center shadow-lg"
              >
                <p className="text-sm font-medium">{f.time}</p>
                <p className="text-xl font-bold">{f.temp}°C</p>
                <p className="text-sm">{f.condition}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full">
        <div className="bg-blue-950 bg-opacity-60 backdrop-blur-md rounded-xl p-6 border border-blue-600 shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-white">
            📊 7-Day Forecast Graph
          </h2>
          <div className="w-full h-64 bg-blue-950 bg-opacity-60 rounded-lg px-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={forecastGraphData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                <XAxis dataKey="day" stroke="#e0e7ff" />
                <YAxis stroke="#e0e7ff" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  name="Temperature (°C)"
                />
                <Line
                  type="monotone"
                  dataKey="humidity"
                  stroke="#facc15"
                  strokeWidth={2}
                  name="Humidity (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full">
        <div className="bg-blue-950 bg-opacity-60 backdrop-blur-md rounded-xl p-6 border border-blue-600 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">
            📥 Download Weather Report
          </h2>
          <div className="flex flex-wrap gap-4">
            {current.historyOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleDownload(opt)}
                className="bg-blue-600 hover:bg-blue-700 cursor-pointer text-white px-4 py-2 rounded-md shadow transition"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
