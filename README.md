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
3. **Start the server:**
   ```sh
   npm start
   ```
4. **Open your browser:**
   - Go to `http://localhost:3000` on any device in your network.

## Dependencies
- [express](https://www.npmjs.com/package/express)
- [ws](https://www.npmjs.com/package/ws)
- [screenshot-desktop](https://www.npmjs.com/package/screenshot-desktop)
- [sharp](https://www.npmjs.com/package/sharp)
- [@nut-tree-fork/nut-js](https://www.npmjs.com/package/@nut-tree-fork/nut-js)
- [systeminformation](https://www.npmjs.com/package/systeminformation)

## Project Repository
- GitHub: [https://github.com/VuviStudio/VuviRemote](https://github.com/VuviStudio/VuviRemote)

## License
MIT License. See [LICENSE](LICENSE) for details.

---

© 2024 VuviStudio. All rights reserved.
