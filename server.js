const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Render définit automatiquement le PORT, sinon on utilise 10000 par défaut
const PORT = process.env.PORT || 10000;

// 1. CRÉATION DU SERVEUR HTTP
// Ce serveur distribue tes fichiers HTML, JS et CSS aux navigateurs
const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/alice-platform.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    const ext = path.extname(filePath);
    const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
    }[ext] || 'text/plain';
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Fichier non trouvé');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

// 2. CRÉATION DU SERVEUR WEBSOCKET (WSS)
// On attache le WebSocket directement au serveur HTTP pour utiliser le MÊME PORT
const wss = new WebSocket.Server({ server });

let aliceSocket = null;
let bobSocket = null;
let alicePublicKey = null;
let bobPublicKey = null;

wss.on('connection', (ws, req) => {
    const url = req.url;
    console.log(`🔌 Nouvelle tentative de connexion: ${url}`);
    
    // Identification des utilisateurs via l'URL (ex: wss://.../?user=alice)
    if (url.includes('alice')) {
        aliceSocket = ws;
        ws.userType = 'alice';
        ws.send(JSON.stringify({ type: 'connected', message: 'Connecté en tant qu\'Alice' }));
        
        // Si Bob a déjà envoyé sa clé, on la donne à Alice
        if (bobPublicKey) {
            ws.send(JSON.stringify({ type: 'public_key', from: 'bob', data: bobPublicKey }));
        }
        console.log('👩 Alice est en ligne');
    } 
    else if (url.includes('bob')) {
        bobSocket = ws;
        ws.userType = 'bob';
        ws.send(JSON.stringify({ type: 'connected', message: 'Connecté en tant que Bob' }));
        
        // Si Alice a déjà envoyé sa clé, on la donne à Bob
        if (alicePublicKey) {
            ws.send(JSON.stringify({ type: 'public_key', from: 'alice', data: alicePublicKey }));
        }
        console.log('👨 Bob est en ligne');
    }
    
    // GESTION DES MESSAGES
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            // Échange de clés publiques PQC
            if (message.type === 'public_key') {
                if (ws.userType === 'alice') {
                    alicePublicKey = message.data;
                    if (bobSocket && bobSocket.readyState === WebSocket.OPEN) {
                        bobSocket.send(JSON.stringify({ type: 'public_key', from: 'alice', data: alicePublicKey }));
                    }
                } else if (ws.userType === 'bob') {
                    bobPublicKey = message.data;
                    if (aliceSocket && aliceSocket.readyState === WebSocket.OPEN) {
                        aliceSocket.send(JSON.stringify({ type: 'public_key', from: 'bob', data: bobPublicKey }));
                    }
                }
            }
            // Transfert des messages chiffrés
            else if (message.type === 'message') {
                if (ws.userType === 'alice' && bobSocket && bobSocket.readyState === WebSocket.OPEN) {
                    bobSocket.send(JSON.stringify({
                        type: 'message', from: 'alice', data: message.data, timestamp: new Date().toISOString()
                    }));
                } 
                else if (ws.userType === 'bob' && aliceSocket && aliceSocket.readyState === WebSocket.OPEN) {
                    aliceSocket.send(JSON.stringify({
                        type: 'message', from: 'bob', data: message.data, timestamp: new Date().toISOString()
                    }));
                }
            }
        } catch (e) {
            console.error("Erreur format message:", e);
        }
    });
    
    // GESTION DES DÉCONNEXIONS
    ws.on('close', () => {
        console.log(`❌ ${ws.userType} s'est déconnecté`);
        if (ws.userType === 'alice') { aliceSocket = null; alicePublicKey = null; }
        if (ws.userType === 'bob') { bobSocket = null; bobPublicKey = null; }
    });
});

// 3. LANCEMENT DU SERVEUR
// On écoute sur 0.0.0.0 pour être accessible depuis l'extérieur (Render)
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur PQC opérationnel !`);
    console.log(`📡 URL Publique: [https://texto.onrender.com](https://texto.onrender.com)`);
});