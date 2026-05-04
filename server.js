const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const WS_PORT = 3001;

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
            res.end('File not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🌐 Serveur HTTP sur http://localhost:${PORT}`);
    console.log(`👩 Alice: http://localhost:${PORT}/alice-platform.html`);
    console.log(`👨 Bob: http://localhost:${PORT}/bob-platform.html`);
});

const wss = new WebSocket.Server({ port: WS_PORT });

let aliceSocket = null;
let bobSocket = null;
let alicePublicKey = null;
let bobPublicKey = null;

wss.on('connection', (ws, req) => {
    const url = req.url;
    console.log(`🔌 Connexion: ${url}`);
    
    if (url.includes('alice')) {
        aliceSocket = ws;
        ws.userType = 'alice';
        ws.send(JSON.stringify({ type: 'connected', message: 'Connecté en tant qu\'Alice' }));
        
        if (bobPublicKey) {
            ws.send(JSON.stringify({ type: 'public_key', from: 'bob', data: bobPublicKey }));
        }
        console.log('👩 Alice connectée');
    } 
    else if (url.includes('bob')) {
        bobSocket = ws;
        ws.userType = 'bob';
        ws.send(JSON.stringify({ type: 'connected', message: 'Connecté en tant que Bob' }));
        
        if (alicePublicKey) {
            ws.send(JSON.stringify({ type: 'public_key', from: 'alice', data: alicePublicKey }));
        }
        console.log('👨 Bob connecté');
    }
    
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        
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
    });
    
    ws.on('close', () => {
        console.log(`❌ ${ws.userType} déconnecté`);
        if (ws.userType === 'alice') { aliceSocket = null; alicePublicKey = null; }
        if (ws.userType === 'bob') { bobSocket = null; bobPublicKey = null; }
    });
});

console.log(`🔌 WebSocket sur ws://localhost:${WS_PORT}`);