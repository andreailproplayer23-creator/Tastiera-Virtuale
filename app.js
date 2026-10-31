let isAudioEnabled = true;
let isShiftActive = false;
let isCapsActive = false;
let socket = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playClickSound() {
    if (!isAudioEnabled) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {}
}

// Elementi DOM
const roleSelector = document.getElementById('role-selector');
const clientView = document.getElementById('client-view');
const keyboardView = document.getElementById('keyboard-view');

const btnSelectClient = document.getElementById('btn-select-client');
const btnBackClient = document.getElementById('btn-back-client');
const btnConnect = document.getElementById('btn-connect');
const btnDisconnect = document.getElementById('btn-disconnect');
const btnToggleSound = document.getElementById('btn-toggle-sound');

const joinCodeInput = document.getElementById('join-code-input');
const clientStatus = document.getElementById('client-status');

const tabKeyboard = document.getElementById('tab-keyboard');
const tabTrackpad = document.getElementById('tab-trackpad');
const panelKeyboard = document.getElementById('panel-keyboard');
const panelTrackpad = document.getElementById('panel-trackpad');

// Imposta placeholder per l'IP
joinCodeInput.placeholder = "es. 192.168.1.5";
joinCodeInput.removeAttribute("maxlength");

btnSelectClient.addEventListener('click', showClientSetup);
btnBackClient.addEventListener('click', resetView);
btnDisconnect.addEventListener('click', resetView);

tabKeyboard.addEventListener('click', () => {
    tabKeyboard.classList.add('active');
    tabTrackpad.classList.remove('active');
    panelKeyboard.classList.remove('hidden');
    panelTrackpad.classList.add('hidden');
});

tabTrackpad.addEventListener('click', () => {
    tabTrackpad.classList.add('active');
    tabKeyboard.classList.remove('active');
    panelTrackpad.classList.remove('hidden');
    panelKeyboard.classList.add('hidden');
});

function resetView() {
    if (socket) socket.close();
    roleSelector.classList.remove('hidden');
    clientView.classList.add('hidden');
    keyboardView.classList.add('hidden');
}

function showClientSetup() {
    roleSelector.classList.add('hidden');
    clientView.classList.remove('hidden');
}

btnConnect.addEventListener('click', () => {
    const ip = joinCodeInput.value.trim();
    if (ip) {
        connectToHost(ip);
    } else {
        showClientError('Inserisci l\'IP del PC.');
    }
});

function connectToHost(ipAddress) {
    clientStatus.classList.add('hidden');
    
    // Connessione WebSocket al PC sulla porta 8080
    socket = new WebSocket(`ws://${ipAddress}:8080`);

    socket.onopen = () => {
        clientView.classList.add('hidden');
        keyboardView.classList.remove('hidden');
        setupKeyboardEvents();
        setupTrackpadEvents();
    };

    socket.onerror = () => {
        showClientError('Impossibile connettersi. Controlla l\'IP o il Firewall del PC.');
    };

    socket.onclose = () => {
        showClientError('Connessione persa con il PC.');
    };
}

function showClientError(msg) {
    clientStatus.innerText = msg;
    clientStatus.classList.remove('hidden');
}

function sendData(payload) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}

function setupKeyboardEvents() {
    const keys = document.querySelectorAll('.key');
    const shortcutBtns = document.querySelectorAll('.shortcut-btn');

    keys.forEach(keyEl => {
        keyEl.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            let key = keyEl.getAttribute('data-key');
            if (!key) return;

            playClickSound();

            if (key === 'Shift') {
                isShiftActive = !isShiftActive;
                document.getElementById('shift-left').classList.toggle('active-toggle', isShiftActive);
                document.getElementById('shift-right').classList.toggle('active-toggle', isShiftActive);
                return;
            }

            if (key === 'CapsLock') {
                isCapsActive = !isCapsActive;
                document.getElementById('caps-key').classList.toggle('active-toggle', isCapsActive);
                return;
            }

            let sendKey = key;
            if (key.length === 1 && (key >= 'a' && key <= 'z')) {
                sendKey = (isShiftActive ^ isCapsActive) ? key.toUpperCase() : key.toLowerCase();
            }

            sendData({ type: 'KEY_PRESS', key: sendKey });

            if (isShiftActive) {
                isShiftActive = false;
                document.getElementById('shift-left').classList.remove('active-toggle');
                document.getElementById('shift-right').classList.remove('active-toggle');
            }

            keyEl.classList.add('active');
            setTimeout(() => keyEl.classList.remove('active'), 100);
        });
    });

    shortcutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-shortcut');
            sendData({ type: 'SHORTCUT', action: action });
        });
    });
}

function setupTrackpadEvents() {
    const trackpad = document.getElementById('trackpad-area');
    const btnLeft = document.getElementById('btn-mouse-left');
    const btnRight = document.getElementById('btn-mouse-right');
    let lastX = 0, lastY = 0;

    trackpad.addEventListener('pointerdown', (e) => {
        lastX = e.clientX;
        lastY = e.clientY;
    });

    trackpad.addEventListener('pointermove', (e) => {
        if (e.buttons !== 1) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        sendData({ type: 'MOUSE_MOVE', dx: dx, dy: dy });
    });

    btnLeft.addEventListener('click', () => sendData({ type: 'MOUSE_CLICK', button: 'left' }));
    btnRight.addEventListener('click', () => sendData({ type: 'MOUSE_CLICK', button: 'right' }));
}

btnToggleSound.addEventListener('click', () => {
    isAudioEnabled = !isAudioEnabled;
    btnToggleSound.innerText = isAudioEnabled ? '🔊' : '🔇';
});