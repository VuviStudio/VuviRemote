# VuviRemote

A high-performance remote desktop control solution built with Node.js and WebSocket technology. Control your Windows PC through any browser with low-latency screen sharing, keyboard/mouse control, and audio streaming capabilities.

## Features
- Ultra-low latency screen sharing
- Multi-monitor support with dynamic, glassy UI
- Full keyboard and mouse control (including multi-screen cursor)
- Audio streaming (if FFmpeg is available)
- Modern, elegant, and responsive web interface

## Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/VuviStudio/VuviRemote.git
   cd VuviRemote
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Install FFmpeg (for audio streaming):**
   - Download FFmpeg from [ffmpeg.org/download](https://ffmpeg.org/download.html)
   - Extract the archive and place the folder in your project root as `ffmpeg/ffmpeg-master-latest-win64-gpl/`
   - The executable should be at: `ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe`
   - _If you only want screen sharing and input, you can skip this step._
4. **Start the server:**
   ```sh
   npm start
   ```
5. **Open your browser:**
   - Go to `http://localhost:3000` on any device in your network.

## Remote Access (LocalTunnel)
To access your server from anywhere, you can use [localtunnel](https://www.npmjs.com/package/localtunnel):

1. Start a tunnel (replace `dmain` with your preferred subdomain):
   ```sh
   npx localtunnel --port 3000 --subdomain dmain
   ```
2. You'll get a public URL like `https://ytcuh.loca.lt` to access your server remotely.

**Note:**
- LocalTunnel is for quick, temporary remote access. For production, use a VPN or reverse proxy with authentication.

## Dependencies
- [express](https://www.npmjs.com/package/express)
- [ws](https://www.npmjs.com/package/ws)
- [screenshot-desktop](https://www.npmjs.com/package/screenshot-desktop)
- [sharp](https://www.npmjs.com/package/sharp)
- [@nut-tree-fork/nut-js](https://www.npmjs.com/package/@nut-tree-fork/nut-js)

## Project Repository
- GitHub: [https://github.com/VuviStudio/VuviRemote](https://github.com/VuviStudio/VuviRemote)

## Troubleshooting & Tips
- **Run as administrator** for best compatibility with input control and screen capture.
- **Antivirus/Firewall:** Allow the app through your firewall and check antivirus settings if you have issues.
- **Audio streaming:**
  - Make sure FFmpeg is installed and the path is correct.
  - You may need to adjust the audio device name in `server.js` for your system.
- **Performance:**
  - Lower the frame rate in `server.js` if you experience lag.
  - Use a wired connection for best results.
- **Security:**
  - For remote access, consider using a VPN or secure tunnel.
  - Add authentication if exposing to the internet.

## License
MIT License. See [LICENSE](LICENSE) for details.

---

© 2024 VuviStudio. All rights reserved.
