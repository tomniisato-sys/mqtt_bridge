const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const mqttHost = process.env.MQTT_HOST;
const mqttPort = process.env.MQTT_PORT;
const mqttUser = process.env.MQTT_USER;
const mqttPass = process.env.MQTT_PASS;


// Step 1: Import libraries
const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Step 2: Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Step 3: HiveMQ connection
const options = {
  host: process.env.MQTT_HOST,
  port: process.env.MQTT_PORT,
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  protocol: 'mqtts'
};

const client = mqtt.connect(options);

// Step 4: Subscribe to topics
client.on('connect', () => {
  console.log('Connected to HiveMQ!');
  client.subscribe('sensor/#'); // all sensor topics
});

// Step 5: Handle incoming messages
client.on('message', async (topic, message) => {
  const payload = message.toString();
  console.log(`Received ${payload} on topic ${topic}`);

  try {
    const data = JSON.parse(payload); // if JSON format

    // Save to Supabase
    const { error } = await supabase
      .from('sensor_data')
      .insert([
        {
          topic: topic,
          temperature: data.temperature,
          humidity: data.humidity,
          timestamp: new Date()
        }
      ]);

    if (error) console.error('Supabase insert error:', error);
  } catch (err) {
    console.error('Failed to parse message:', err);
  }
});

