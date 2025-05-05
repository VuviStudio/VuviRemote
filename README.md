# VuviRemote

A high-performance remote desktop control solution built with Node.js and WebSocket technology. Control your Windows PC through any browser with low-latency screen sharing, keyboard/mouse control, and audio streaming capabilities.

![License](https://img.shields.io/badge/license-Copyright%20%C2%A9%202024-blue)
![Node](https://img.shields.io/badge/Node.js->=14-green)
![Platform](https://img.shields.io/badge/platform-Windows-blue)

## Features

- Low-latency screen sharing (15 FPS)
- Full keyboard input support
- Precise mouse control
- Auto-reconnect system
- Audio streaming capability (bugged)
- Mobile-friendly interface
- Fullscreen mode
- Special arrow key controls:
  - Left/Right: Move mouse cursor
  - Up: Hold right click
  - Down: Hold left click

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [FFmpeg](https://ffmpeg.org/download.html) for audio streaming
- Windows OS

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/VuviStudio/VuviRemote.git
cd VuviRemote
```

2. Install dependencies:
```bash
npm install
```

3. Set up FFmpeg:
   - Download [FFmpeg](https://ffmpeg.org/download.html)
   - Create `ffmpeg` folder in project root
   - Extract FFmpeg files to: `ffmpeg/ffmpeg-master-latest-win64-gpl/`
   - Verify path: `ffmpeg/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe`

4. Start the server:
```bash
node server.js
```

5. Access:
   - Local: http://localhost:3000
   - Remote access:
     ```bash
     npx localtunnel --port 3000
     ```

## Dependencies

```json
{
  "express": "^4.18.2",
  "ws": "^8.13.0",
  "screenshot-desktop": "^1.12.7",
  "@nut-tree-fork/nut-js": "^4.2.6"
}
```

## Security Notes

1. Local Network Use:
   - Preferably use within secure local networks
   - Use VPN for remote access
   - Implement authentication if needed

2. Remote Access:
   - Use HTTPS when possible
   - Be cautious with localtunnel URLs
   - Consider firewall rules

## Troubleshooting

### Screen Sharing Issues
- Run as administrator
- Check antivirus settings
- Verify screen capture permissions

### Audio Problems
- Run `ffmpeg -list_devices true -f dshow -i dummy` to list available devices
- Update audio device name in server.js
- Check browser audio permissions

### Input Control Issues
- Run as administrator
- Check for conflicting software
- Verify Windows permissions

## Known Limitations

- Windows OS only
- Requires admin rights
- May conflict with UAC prompts
- Performance depends on network speed
- Some antivirus software may block features

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## License & Copyright

Copyright (c) 2024 VuviStudio. All rights reserved.

This project is licensed under strict copyright terms. See the [LICENSE](LICENSE) file for details.

## Credits

Created by [VuviStudio](https://github.com/VuviStudio)
