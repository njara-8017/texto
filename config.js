const CONFIG = {
    // Si l'URL contient 'onrender.com', on utilise l'adresse sécurisée de Render
    // Sinon, on utilise l'adresse locale pour tes tests sur PC
    WS_URL: window.location.hostname.includes('onrender.com') 
        ? `wss://${window.location.hostname}` 
        : 'ws://localhost:10000'
};