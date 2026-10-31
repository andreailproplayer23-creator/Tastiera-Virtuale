const WebSocket = require('ws');
const robot = require('robotjs');
const os = require('os');

// Trova l'IP locale del PC
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });
const localIP = getLocalIP();

console.clear();
console.log('==================================================');
console.log('  🖥️  TASTIERA VIRTUALE - SERVER PC ATTIVO');
console.log('==================================================');
console.log(`\n  👉 INDIRIZZO IP DEL PC: \x1b[33m\x1b[1m${localIP}\x1b[0m\n`);
console.log(`  Assicurati che il Tablet sia connesso al WiFi.`);
console.log('--------------------------------------------------\n');

wss.on('connection', (ws) => {
    console.log('📱 TABLET CONNESSO! Tastiera e Trackpad pronti.');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Gestione Tastiera
            if (data.type === 'KEY_PRESS') {
                const k = data.key;

                const keyMap = {
                    'Backspace': 'backspace',
                    'Enter': 'enter',
                    ' ': 'space',
                    'Tab': 'tab',
                    'Escape': 'escape',
                    'ArrowUp': 'up',
                    'ArrowDown': 'down',
                    'ArrowLeft': 'left',
                    'ArrowRight': 'right'
                };

                if (keyMap[k]) {
                    robot.keyTap(keyMap[k]);
                } else if (k.length === 1) {
                    const isUpper = k === k.toUpperCase() && k !== k.toLowerCase();
                    if (isUpper) {
                        robot.keyTap(k.toLowerCase(), 'shift');
                    } else {
                        robot.keyTap(k);
                    }
                }
            }

            // Gestione Mouse / Trackpad
            if (data.type === 'MOUSE_MOVE') {
                const pos = robot.getMousePos();
                robot.moveMouse(pos.x + data.dx * 2.5, pos.y + data.dy * 2.5);
            }

            // Gestione Click Mouse
            if (data.type === 'MOUSE_CLICK') {
                robot.mouseClick(data.button || 'left');
            }

            // Gestione Shortcut
            if (data.type === 'SHORTCUT') {
                if (data.action === 'select-all') robot.keyTap('a', 'control');
                if (data.action === 'copy') robot.keyTap('c', 'control');
                if (data.action === 'paste') robot.keyTap('v', 'control');
                if (data.action === 'undo') robot.keyTap('z', 'control');
            }
        } catch (err) {
            console.error('Errore durante la gestione del messaggio:', err.message);
        }
    });

    ws.on('close', () => {
        console.log('⚠️ Tablet disconnesso.');
    });
});