// ====== Imports and Config ======
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const http = require('http'); // For tiny HTTP server on Render

// ====== Environment Variables ======
// Make sure these are set in Render's Environment Variables settings
const SUPABASE_URL = process.env.SUPABASE_URL;   // Your Supabase project URL
const SUPABASE_KEY = process.env.SUPABASE_KEY;   // Your Supabase API key
const MQTT_HOST = process.env.MQTT_HOST;         // HiveMQ / MQTT broker host
const MQTT_PORT = process.env.MQTT_PORT;         // MQTT broker port
const MQTT_USER = process.env.MQTT_USER;         // MQTT username
const MQTT_PASS = process.env.MQTT_PASS;         // MQTT password
const BLYNK_TOKEN = process.env.BLYNK_TOKEN;     // Your Blynk token

// ====== Supabase Client ======
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ====== MQTT Client and Options ======
const options = {
  host: MQTT_HOST,
  port: MQTT_PORT,
  username: MQTT_USER,
  password: MQTT_PASS,
  protocol: 'mqtts'
};

const client = mqtt.connect(options);

// ====== Subscribe to MQTT Topics ======
client.on('connect', () => {
  console.log('Connected to HiveMQ!');

  // --- 🔹 Add your MQTT topics here ---
  client.subscribe('arduino/current'); // Example: listen to all topics under 'sensor/'
  // You can add more topics like:
  // client.subscribe('sensor/temperature');
  // client.subscribe('sensor/humidity');
});

// ====== Handle Incoming MQTT Messages ======
client.on('message', async (topic, message) => {
  const payload = message.toString();
  console.log(`Received ${payload} on topic ${topic}`);

  try {
    const data = JSON.parse(payload); // Example: { temperature: 23.5, humidity: 60 }

    // --- 🔹 Insert into Supabase ---
    await supabase.from('sensor_data').insert([{
      topic: topic,
      current: data.current, // Ensure your JSON has this field
      timestamp: new Date()
    }]).then(({ error }) => {
      if (error) console.error('Supabase insert error:', error);
    });

    // --- 🔹 Push to Blynk ---
    // Map your JSON fields to Blynk virtual pins
    // V1 = current (change if needed)
    axios.get(`https://blynk.cloud/external/api/update?token=${BLYNK_TOKEN}&v1=${data.current}`)
      .then(() => console.log(`Blynk updated with current: ${data.current}`))
      .catch(err => console.error('Blynk update error:', err));

  } catch (err) {
    console.error('Failed to handle message:', err);
  }
});

// ====== Tiny HTTP Server for Render ======
// Do NOT remove this — Render requires at least one open port
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Bridge is running!");
}).listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

// ====== Optional: Heartbeat for Logs ======
// Prints every 30 seconds to show the script is alive
setInterval(() => {
  console.log("Bridge is alive and running...");
}, 30000);
