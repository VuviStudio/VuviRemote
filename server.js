const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const screenshot = require('screenshot-desktop');
const { mouse, keyboard, Point, Button, Key } = require("@nut-tree-fork/nut-js");
const { spawn } = require('child_process');
const path = require('path');

mouse.config.autoDelayMs = 0;
keyboard.config.autoDelayMs = 0;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const mouseState = {
    left: false,
    right: false
};

const pressedKeys = new Set();
const modifierKeys = new Set();

const specialKeys = new Set(['Escape', 'Tab', 'CapsLock', 'Enter', 'Backspace', 'Delete']);

const keyMap = {
    'Backspace': Key.Backspace,
    'Tab': Key.Tab,
    'Enter': Key.Enter,
    'Shift': Key.LeftShift,
    'Control': Key.LeftControl,
    'Alt': Key.LeftAlt,
    'Meta': Key.LeftSuper,
    'OS': Key.LeftSuper,
    'CapsLock': Key.CapsLock,
    'Escape': Key.Escape,
    'Space': Key.Space,
    ' ': Key.Space,
    'Delete': Key.Delete,
    'ArrowLeft': Key.Left,
    'ArrowUp': Key.Up,
    'ArrowRight': Key.Right,
    'ArrowDown': Key.Down,
    ';': Key.Semicolon,
    '.': Key.Period,
    ',': Key.Comma,
    '/': Key.Slash,
    '\\': Key.Backslash,
    '[': Key.LeftBracket,
    ']': Key.RightBracket,
    '\'': Key.Quote,
    '-': Key.Minus,
    '=': Key.Equal,
    '`': Key.Grave,
    'a': Key.A,
    'b': Key.B,
    'c': Key.C,
    'd': Key.D,
    'e': Key.E,
    'f': Key.F,
    'g': Key.G,
    'h': Key.H,
    'i': Key.I,
    'j': Key.J,
    'k': Key.K,
    'l': Key.L,
    'm': Key.M,
    'n': Key.N,
    'o': Key.O,
    'p': Key.P,
    'q': Key.Q,
    'r': Key.R,
    's': Key.S,
    't': Key.T,
    'u': Key.U,
    'v': Key.V,
    'w': Key.W,
    'x': Key.X,
    'y': Key.Y,
    'z': Key.Z,
    '0': Key.Num0,
    '1': Key.Num1,
    '2': Key.Num2,
    '3': Key.Num3,
    '4': Key.Num4,
    '5': Key.Num5,
    '6': Key.Num6,
    '7': Key.Num7,
    '8': Key.Num8,
    '9': Key.Num9
};

function startAudioCapture(ws) {
    const ffmpeg_list = spawn('ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe', [
        '-f', 'dshow',
        '-list_devices', 'true',
        '-i', 'dummy'
    ]);

    ffmpeg_list.stderr.on('data', (data) => {
        console.log('Available devices:', data.toString());
    });

    setTimeout(() => {
        const ffmpeg = spawn('ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe', [
            '-f', 'dshow',
            '-i', 'audio=YOUR_AUDIO_DEVICE_NAME',
            '-acodec', 'pcm_s16le',    
            '-ar', '44100',           
            '-ac', '2',               
            '-f', 'wav',               
            'pipe:1'                  
        ]);

        ffmpeg.on('error', (err) => {
            console.error('FFmpeg error:', err);
        });

        ffmpeg.stdout.on('data', (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'audio',
                    data: data.toString('base64')
                }));
            }
        });

        ffmpeg.stderr.on('data', (data) => {
            console.error('FFmpeg:', data.toString());
        });

        return ffmpeg;
    }, 1000);
}

wss.on('connection', (ws) => {
    console.log('Client connected');
    let audioProcess = null;
    let lastScreenshot = null;
    let isCapturing = false;

    const screenInterval = setInterval(async () => {
        if (isCapturing || ws.readyState !== WebSocket.OPEN) return;
        
        try {
            isCapturing = true;
            const screen = await screenshot();
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(screen, { binary: true });
            }
        } catch (err) {
            console.error('Screenshot error:', err);
        } finally {
            isCapturing = false;
        }
    }, 1000/15);

    try {
        audioProcess = startAudioCapture(ws);
    } catch (err) {
        console.error('Failed to start audio capture:', err);
    }

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'mousemove':
                    try {
                        await mouse.setPosition(new Point(
                            Math.floor(data.x),
                            Math.floor(data.y)
                        ));
                    } catch (err) {
                        console.error('Mouse move error:', err);
                    }
                    break;
                case 'wheel':
                    try {
                        const scrollAmount = Math.sign(data.deltaY) * 100;
                        if (scrollAmount > 0) {
                            await mouse.scrollDown(scrollAmount);
                        } else {
                            await mouse.scrollUp(-scrollAmount);
                        }
                    } catch (err) {
                        console.error('Mouse wheel error:', err);
                    }
                    break;
                case 'mousedown':
                    try {
                        const button = data.button === 'left' ? Button.LEFT : Button.RIGHT;
                        mouseState[data.button] = true;
                        await mouse.pressButton(button);
                    } catch (err) {
                        console.error('Mouse down error:', err);
                    }
                    break;
                case 'mouseup':
                    try {
                        const button = data.button === 'left' ? Button.LEFT : Button.RIGHT;
                        mouseState[data.button] = false;
                        await mouse.releaseButton(button);
                    } catch (err) {
                        console.error('Mouse up error:', err);
                    }
                    break;
                case 'keydown':
                    try {
                        const key = data.key;
                        const isModifier = ['Control', 'Alt', 'Shift', 'Meta', 'OS'].includes(key);
                        const mappedKey = keyMap[key] || keyMap[key.toLowerCase()];

                        if (specialKeys.has(key)) {
                            await keyboard.pressKey(mappedKey);
                            break;
                        }

                        if (isModifier) {
                            modifierKeys.add(key.toLowerCase());
                            if (key === 'Meta' || key === 'OS') {
                                await keyboard.pressKey(Key.LeftSuper);
                            } else if (key === 'Shift') {
                                await keyboard.pressKey(Key.LeftShift);
                            } else if (key === 'Control') {
                                await keyboard.pressKey(Key.LeftControl);
                            } else if (key === 'Alt') {
                                await keyboard.pressKey(Key.LeftAlt);
                            }
                        }

                        if (!pressedKeys.has(key) && mappedKey) {
                            pressedKeys.add(key);
                            if (data.shift) await keyboard.pressKey(Key.LeftShift);
                            if (data.ctrl) await keyboard.pressKey(Key.LeftControl);
                            if (data.alt) await keyboard.pressKey(Key.LeftAlt);
                            await keyboard.pressKey(mappedKey);
                        }

                        if (modifierKeys.has('control') && pressedKeys.has(key.toLowerCase())) {
                            switch(key.toLowerCase()) {
                                case 'a':
                                case 'c':
                                case 'v':
                                case 'x':
                                case 'z':
                                case 'y':
                                    await keyboard.pressKey(Key.LeftControl);
                                    await keyboard.pressKey(keyMap[key.toLowerCase()]);
                                    break;
                            }
                        }

                        if (modifierKeys.has('control')) {
                            if (key === 'ArrowUp') {
                                await mouse.scrollUp(120);
                            } else if (key === 'ArrowDown') {
                                await mouse.scrollDown(120);
                            }
                        }
                    } catch (err) {
                        console.error('Keyboard down error:', err);
                    }
                    break;
                case 'keyup':
                    try {
                        const key = data.key;
                        const isModifier = ['Control', 'Alt', 'Shift', 'Meta', 'OS'].includes(key);
                        const mappedKey = keyMap[key] || keyMap[key.toLowerCase()];

                        if (specialKeys.has(key)) {
                            await keyboard.releaseKey(mappedKey);
                            break;
                        }

                        if (isModifier) {
                            modifierKeys.delete(key.toLowerCase());
                            if (key === 'Meta' || key === 'OS') {
                                await keyboard.releaseKey(Key.LeftSuper);
                            } else if (key === 'Shift') {
                                await keyboard.releaseKey(Key.LeftShift);
                            } else if (key === 'Control') {
                                await keyboard.releaseKey(Key.LeftControl);
                            } else if (key === 'Alt') {
                                await keyboard.releaseKey(Key.LeftAlt);
                            }
                        }

                        if (pressedKeys.has(key) && mappedKey) {
                            pressedKeys.delete(key);
                            if (data.shift) await keyboard.releaseKey(Key.LeftShift);
                            if (data.ctrl) await keyboard.releaseKey(Key.LeftControl);
                            if (data.alt) await keyboard.releaseKey(Key.LeftAlt);
                            await keyboard.releaseKey(mappedKey);
                        }

                        if (key === 'Control' || !modifierKeys.has('control')) {
                            switch(key.toLowerCase()) {
                                case 'a':
                                case 'c':
                                case 'v':
                                case 'x':
                                case 'z':
                                case 'y':
                                    await keyboard.releaseKey(Key.LeftControl);
                                    await keyboard.releaseKey(keyMap[key.toLowerCase()]);
                                    break;
                            }
                        }
                    } catch (err) {
                        console.error('Keyboard up error:', err);
                    }
                    break;
            }
        } catch (err) {
            console.error('Input error:', err);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clearInterval(screenInterval);
        if (audioProcess) {
            audioProcess.kill();
        }
        if (mouseState.left) {
            mouse.releaseButton(Button.LEFT).catch(console.error);
        }
        if (mouseState.right) {
            mouse.releaseButton(Button.RIGHT).catch(console.error);
        }
        for (const key of pressedKeys) {
            const mappedKey = keyMap[key] || keyMap[key.toLowerCase()];
            if (mappedKey) {
                keyboard.releaseKey(mappedKey).catch(console.error);
            }
        }
        pressedKeys.clear();
        modifierKeys.clear();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 
