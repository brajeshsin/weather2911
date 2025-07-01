const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const WebSocket = require("ws");

dotenv.config();
const app = express();
// const PORT = 5000;
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});

// Setup WebSocket
const wss = new WebSocket.Server({ server });
const clients = [];

// Handle new WebSocket connections
wss.on("connection", (ws) => {
  console.log(" New client connected");

  // Default to Delhi
  clients.push({ ws, city: "Delhi" });

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "city") {
        const client = clients.find((c) => c.ws === ws);
        if (client) client.city = data.city;
        console.log(" City updated to:", data.city);
      }
    } catch (err) {
      console.error(" Invalid message format:", err.message);
    }
  });

  ws.on("close", () => {
    console.log(" Client disconnected");
    const index = clients.findIndex((c) => c.ws === ws);
    if (index !== -1) clients.splice(index, 1);
  });
});

const getLast7DaysWeather = async (lat, lon) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6);

  const start = startDate.toISOString().split("T")[0];
  const end = endDate.toISOString().split("T")[0];

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,relative_humidity_2m_max&timezone=auto`;

  const res = await axios.get(url);
  const data = res.data.daily;

  return data.time.map((day, i) => ({
    day: new Date(day).toLocaleDateString("en-IN", { weekday: "short" }),
    temp: data.temperature_2m_max[i],
    humidity: data.relative_humidity_2m_max[i],
  }));
};

const getNext6Forecasts = async (city) => {
  const res = await axios.get(
    `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`
  );

  return res.data.list.slice(0, 6).map((entry) => {
    const date = new Date(entry.dt_txt);
    const time = date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const condition = entry.weather[0].main;
    const conditionEmoji =
      {
        Clear: "☀️ Sunny",
        Clouds: "⛅ Cloudy",
        Rain: "🌧️ Rainy",
        Thunderstorm: "⛈️ Storm",
        Drizzle: "🌦️ Drizzle",
        Snow: "❄️ Snow",
        Mist: "🌫️ Mist",
      }[condition] || "🌡️";

    return {
      time,
      temp: Math.round(entry.main.temp),
      condition: conditionEmoji,
    };
  });
};

const broadcastWeatherData = async () => {
  for (const client of clients) {
    try {
      if (client.ws.readyState !== WebSocket.OPEN) continue;

      const city = client.city || "Delhi";

      // Current Weather
      const currentRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`
      );
      const { lat, lon } = currentRes.data.coord;

      // 7-Day Historical
      const forecastGraphData = await getLast7DaysWeather(lat, lon);

      // 6 Upcoming Forecasts
      const forecast = await getNext6Forecasts(city);

      // Final Weather Object
      const weather = {
        temp: currentRes.data.main.temp,
        humidity: currentRes.data.main.humidity,
        wind: currentRes.data.wind.speed,
        city: currentRes.data.name,
        timestamp: new Date(),
        forecastGraphData,
        forecast,
      };

      client.ws.send(JSON.stringify(weather));
    } catch (err) {
      console.error(` Error fetching data for ${client.city}:`, err.message);
    }
  }
};

// Broadcast every 20 seconds
setInterval(broadcastWeatherData, 20000);
// setInterval(broadcastWeatherData, 30 * 60 * 1000); // 30 minutes
