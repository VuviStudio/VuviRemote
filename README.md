# Robot Remote Desktop

A modern, multi-screen remote desktop control app for Windows with:
- **Live multi-monitor previews**
- **Dynamic, elegant UI** (glassmorphism, smooth transitions, custom cursor)
- **Accurate Windows multi-monitor support** (real screen bounds)
- **Custom, highly visible pointer**
- **Fast, low-latency streaming**

## Features
- Switch between any number of screens with live previews
- Beautiful, minimal, and responsive UI
- Glassy, blurred popups and dynamic screen cards
- Custom SVG cursor with perfect click accuracy
- Keyboard and mouse input control
- Audio streaming (if FFmpeg is available)

## Requirements
- **Node.js 18+** (recommended)
- Windows OS (for multi-monitor accuracy)
- [FFmpeg](https://ffmpeg.org/) (optional, for audio streaming)

## Installation
1. Clone this repository:
   ```sh
   git clone <your-repo-url>
   cd robot-remote-desktop
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. (Optional) Download and extract FFmpeg to `ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe` for audio support.

## Usage
Start the server:
```sh
npm start
```

Open your browser and go to [http://localhost:3000](http://localhost:3000)

- Use the screen switcher button (bottom left) to view and switch between screens.
- The UI adapts to any number of monitors.
- All input is relayed in real time.

## Customization
- Edit `public/index.html` for UI tweaks.
- Edit `server.js` for server-side logic.

## License
MIT
