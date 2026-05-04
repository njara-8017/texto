// config.js
const WS_URL = window.location.hostname === 'localhost' 
    ? 'ws://localhost:3001'
    : `wss://${window.location.hostname}`;