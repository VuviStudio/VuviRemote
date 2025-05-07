const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const screenshot = require('screenshot-desktop');
const { mouse, keyboard, Point, Button, Key } = require("@nut-tree-fork/nut-js");
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

mouse.config.autoDelayMs = 0;
keyboard.config.autoDelayMs = 0;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const SCREENSHOT_SETTINGS = {
    quality: 50,        
    scale: 0.7,         
    frameRate: 60,      
    maxFrameTime: 33,   
    memoryLimit: 100    
};

let screens = [];
let activeScreenIndex = 0;

function getWindowsScreens() {
    try {
        const psCommand = `
Add-Type -AssemblyName System.Windows.Forms;
$monitors = [System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
    [PSCustomObject]@{
        DeviceName = $_.DeviceName;
        X = $_.Bounds.X;
        Y = $_.Bounds.Y;
        Width = $_.Bounds.Width;
        Height = $_.Bounds.Height;
    }
};
$monitors | ConvertTo-Json -Compress
        `.replace(/\n/g, ' ');

        const output = execSync(`powershell -NoProfile -Command \"${psCommand}\"`, { encoding: 'utf8' });
        return JSON.parse(output);
    } catch (err) {
        console.error('Failed to get screen info from PowerShell:', err);
        return [];
    }
}

async function detectScreens() {
    try {
        const displays = await screenshot.listDisplays();
        const winScreens = getWindowsScreens();

        screens = displays.map((display, index) => {
            const winScreen = winScreens.find(s => s.DeviceName === display.name || s.DeviceName === display.id);
            let bounds;
            if (winScreen) {
                bounds = {
                    x: winScreen.X,
                    y: winScreen.Y,
                    width: winScreen.Width,
                    height: winScreen.Height
                };
            } else {
                bounds = display.bounds || { x: 0, y: 0, width: 1920, height: 1080 };
            }
            return {
                id: display.id || index,
                name: display.name || `Screen ${index + 1}`,
                bounds,
                isActive: index === 0
            };
        });

        console.log('Detected screens:', screens);

        for (let i = 0; i < screens.length; i++) {
            try {
                const filename = `screen${i + 1}.png`;
                const filepath = path.join(__dirname, 'public', filename);
                const screen = await screenshot({ screen: screens[i].id });
                await fs.promises.writeFile(filepath, screen);
                console.log(`Captured initial screenshot for ${screens[i].name}`);
            } catch (err) {
                console.error(`Error capturing initial screenshot for screen ${i}:`, err);
            }
        }

        return screens;
    } catch (err) {
        console.error('Error detecting screens:', err);
        screens = [{
            id: 0,
            name: 'Screen 1',
            bounds: { x: 0, y: 0, width: 1920, height: 1080 },
            isActive: true
        }];
        return screens;
    }
}

let screenInitPromise = detectScreens();

let frameBuffer = [];
let lastFrameTime = 0;
let frameCount = 0;
let totalDelay = 0;

function cleanupMemory() {
    if (frameBuffer.length > SCREENSHOT_SETTINGS.memoryLimit) {
        frameBuffer = frameBuffer.slice(-SCREENSHOT_SETTINGS.memoryLimit);
    }
}

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

function checkFFmpegExists() {
    const ffmpegPath = 'ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe';
    return fs.existsSync(ffmpegPath);
}

function startAudioCapture(ws) {
    if (!checkFFmpegExists()) {
        console.log('FFmpeg not found - audio capture disabled');
        return null;
    }

    try {
        const ffmpeg_list = spawn('ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe', [
            '-f', 'dshow',
            '-list_devices', 'true',
            '-i', 'dummy'
        ]);

        ffmpeg_list.stderr.on('data', (data) => {
            console.log('Available devices:', data.toString());
        });

        setTimeout(() => {
            try {
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
            } catch (err) {
                console.error('Failed to start FFmpeg audio capture:', err);
                return null;
            }
        }, 1000);
    } catch (err) {
        console.error('Failed to list audio devices:', err);
        return null;
    }
}

async function captureScreenPreview(screenIndex) {
    try {
        const screenObj = screens[screenIndex];
        const filename = `screen${screenIndex + 1}.png`;
        const filepath = path.join(__dirname, 'public', filename);
        const screen = await screenshot({ screen: screenObj.id });
        await fs.promises.writeFile(filepath, screen);
        const preview = await sharp(screen)
            .resize(320, 180, { fit: 'inside' })
            .jpeg({ quality: 70 })
            .toBuffer();
        return {
            preview: preview.toString('base64'),
            filename: filename
        };
    } catch (err) {
        console.error('Error capturing screen preview:', err);
        return null;
    }
}

async function screenshotLoop(ws) {
    while (ws.readyState === WebSocket.OPEN) {
        const now = Date.now();
        let frameStart = now;
        try {
            const activeScreen = screens[activeScreenIndex];
            if (!activeScreen || !activeScreen.bounds) {
                throw new Error('Invalid screen configuration');
            }
            const screen = await screenshot({ screen: activeScreen.id });
            const processedImage = await sharp(screen)
                .resize(Math.floor(activeScreen.bounds.width * SCREENSHOT_SETTINGS.scale))
                .jpeg({ quality: SCREENSHOT_SETTINGS.quality })
                .toBuffer();
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(processedImage, { binary: true });
                lastFrameTime = now;
                frameCount++;
                totalDelay += Date.now() - frameStart;
                if (frameCount % 30 === 0) {
                    const avgDelay = totalDelay / 30;
                    console.log(`Average frame delay: ${avgDelay.toFixed(2)}ms`);
                    totalDelay = 0;
                }
            }
        } catch (err) {
            console.error('Screenshot error:', err);
        }
        cleanupMemory();
        const elapsed = Date.now() - frameStart;
        const delay = Math.max(0, (1000 / SCREENSHOT_SETTINGS.frameRate) - elapsed);
        await new Promise(res => setTimeout(res, delay));
    }
}

wss.on('connection', async (ws) => {
    console.log('Client connected');
    let audioProcess = null;
    let isCapturing = false;
    let clientWidth = 0;
    let clientHeight = 0;

    await screenInitPromise;

    ws.send(JSON.stringify({
        type: 'screens',
        screens: screens,
        activeScreen: activeScreenIndex
    }));

    let screenshotActive = true;
    screenshotLoop(ws);

    audioProcess = startAudioCapture(ws);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'dimensions':
                    clientWidth = data.width;
                    clientHeight = data.height;
                    break;
                case 'mousemove':
                    try {
                        const activeScreen = screens[activeScreenIndex];
                        if (!activeScreen || !activeScreen.bounds) {
                            throw new Error('Invalid screen configuration');
                        }

                        const scaleX = activeScreen.bounds.width / clientWidth;
                        const scaleY = activeScreen.bounds.height / clientHeight;
                        
                        const x = Math.floor(data.x * scaleX) + activeScreen.bounds.x;
                        const y = Math.floor(data.y * scaleY) + activeScreen.bounds.y;
                        
                        await mouse.setPosition(new Point(x, y));
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
                case 'getScreenPreviews':
                    const previews = [];
                    const filenames = [];
                    for (let i = 0; i < screens.length; i++) {
                        const result = await captureScreenPreview(i);
                        if (result) {
                            previews.push(result.preview);
                            filenames.push(result.filename);
                        }
                    }
                    ws.send(JSON.stringify({
                        type: 'screenPreviews',
                        previews: previews,
                        filenames: filenames
                    }));
                    break;
                case 'switchScreen':
                    if (data.screenIndex >= 0 && data.screenIndex < screens.length) {
                        activeScreenIndex = data.screenIndex;
                        screens.forEach((screen, index) => {
                            screen.isActive = index === activeScreenIndex;
                        });
                        const activeScreen = screens[activeScreenIndex];
                        if (activeScreen && activeScreen.bounds) {
                            const centerX = Math.floor(activeScreen.bounds.x + activeScreen.bounds.width / 2);
                            const centerY = Math.floor(activeScreen.bounds.y + activeScreen.bounds.height / 2);
                            console.log(`[SWITCH] Moving mouse to screen ${activeScreenIndex}: (${centerX}, ${centerY})`, activeScreen);
                            mouse.setPosition(new Point(centerX, centerY)).then(() => {
                                console.log(`[SWITCH] Mouse moved to (${centerX}, ${centerY}) on screen ${activeScreenIndex}`);
                            }).catch(err => {
                                console.error('[SWITCH] Mouse move error:', err);
                            });
                        } else {
                            console.warn('[SWITCH] No active screen bounds found for', activeScreenIndex, activeScreen);
                        }
                        ws.send(JSON.stringify({
                            type: 'screens',
                            screens: screens,
                            activeScreen: activeScreenIndex
                        }));
                    }
                    break;
            }
        } catch (err) {
            console.error('Input error:', err);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        screenshotActive = false;
        if (audioProcess) {
            try {
                audioProcess.kill();
            } catch (err) {
                console.error('Error killing audio process:', err);
            }
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
