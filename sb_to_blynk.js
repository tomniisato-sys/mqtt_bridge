// sb_to_blynk.js

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://your-supabase-url.supabase.co';
const SUPABASE_KEY = 'your-supabase-api-key';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BLYNK_URL = 'http://blynk-cloud.com';
const BLYNK_TOKEN = 'your-blynk-token';
const BLYNK_VPIN = 'V1'; // Virtual pin to update

// --- FUNCTION: GET LATEST DATA FROM SUPABASE ---
async function getLatestSensorData() {
    const { data, error } = await supabase
        .from('sensor_data')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Supabase error:', error);
        return null;
    }
    return data[0];
}

// --- FUNCTION: PUSH DATA TO BLYNK ---
async function pushToBlynk(value) {
    try {
        await axios.get(`${BLYNK_URL}/${BLYNK_TOKEN}/update/${BLYNK_VPIN}?value=${value}`);
        console.log('Data sent to Blynk:', value);
    } catch (err) {
        console.error('Blynk error:', err.message);
    }
}

// --- BRIDGE LOOP ---
async function bridgeLoop() {
    const data = await getLatestSensorData();
    if (data) {
        // Replace 'current' with the actual field name from your table
        await pushToBlynk(data.current);
    }
}

// Run every 10 seconds (adjust interval as needed)
setInterval(bridgeLoop, 10000);
