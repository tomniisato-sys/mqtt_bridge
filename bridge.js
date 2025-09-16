// ====== Imports and Config ======
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const http = require('http'); // <-- added for tiny HTTP server

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = process.env.MQTT_PORT;
const MQTT_USER = process.env.MQTT_USER;
const MQTT_PASS = process.env.MQTT_PASS;
const BLYNK_TOKEN = process.env.BLYNK_TOKEN;

// ====== Supabase client ======
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ====== MQTT client and options ======
const options = {
  host: MQTT_HOST,
  port: MQTT_PORT,
  username: MQTT_USER,
  password: MQTT_PASS,
  protocol: 'mqtts'
};

const client = mqtt.connect(options);

// ====== Subscribe to MQTT topics ======
client.on('connect', () => {
  console.log('Connected to HiveMQ!');
  client.subscribe('sensor/#'); // Listen to all sensor topics
});

// ====== Handle incoming MQTT messages ======
client.on('message', async (topic, message) => {
  const payload = message.toString();
  console.log(`Received ${payload} on topic ${topic}`);

  try {
    // Parse incoming JSON message
    const data = JSON.parse(payload); // e.g., { temperature: 23.5, humidity: 60 }

    // --- 1️⃣ Insert data into Supabase ---
    supabase.from('sensor_data').insert([{
      topic: topic,
      temperature: data.temperature,
      humidity: data.humidity,
      timestamp: new Date()
    }])
    .then(({ error }) => {
      if (error) console.error('Supabase insert error:', error);
    });

    // --- 2️⃣ Push real-time data to Blynk ---
    // Temperature to virtual pin V1
    axios.get(`https://blynk.cloud/external/api/update?token=${BLYNK_TOKEN}&v1=${data.temperature}`)
      .then(() => console.log(`Blynk updated with temperature: ${data.temperature}`))
      .catch(err => console.error('Blynk update error:', err));

    // Humidity to virtual pin V2 (optional)
    axios.get(`https://blynk.cloud/external/api/update?token=${BLYNK_TOKEN}&v2=${data.humidity}`)
      .then(() => console.log(`Blynk updated with humidity: ${data.humidity}`))
      .catch(err => console.error('Blynk update error:', err));

  } catch (err) {
    console.error('Failed to handle message:', err);
  }
});

// ====== Tiny HTTP server for Render ======
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bridge is running!");
}).listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});
