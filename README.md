<p align="center">
  <img src="./public/favicon.png" alt="VisionTest logo" width="240" />
</p>

<h1 align="center">VisionTest</h1>

<p align="center">
  An HCI-oriented intelligent vision screening application for convenient, faster, and more accessible daily eyesight self-checks.
</p>

<p align="center">
  English |
  <a href="./README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Wails-v3-0F172A?logo=go&logoColor=white" alt="Wails v3" />
  <img src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5.8" />
  <img src="https://img.shields.io/badge/MediaPipe-Tasks%20Vision-34A853?logo=google&logoColor=white" alt="MediaPipe Tasks Vision" />
  <a href="https://github.com/Chaotze/VisionTest/blob/master/LICENSE">
    <img alt="GitHub" src="https://img.shields.io/github/license/Chaotze/VisionTest"/>
  </a>
  <a href="https://github.com/Chaotze/VisionTest/tags" rel="nofollow">
    <img alt="GitHub tag (latest SemVer pre-release)" src="https://img.shields.io/github/v/tag/Chaotze/VisionTest?include_prereleases&label=version"/>
  </a>
</p>

<p align="center">
  <a href="#overview">Overview</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#features">Features</a> |
  <a href="#how-it-works">How It Works</a> |
  <a href="#contributing">Contributing</a>
</p>

> [!IMPORTANT]
> VisionTest is a preventive self-screening tool. It does not replace professional medical diagnosis, hospital examination, or optometry services. If results are abnormal, unstable, or inconsistent with daily experience, users should visit an ophthalmology department or optometry center.

## Overview

![Overview](./dev/images/image-overview.png)

VisionTest is an intelligent vision screening application built around HCI and computer vision. It is designed for students, office workers, and family users who want to monitor their eyesight condition with ordinary hardware: a computer screen and a webcam.

Instead of relying on a fixed printed chart and a fixed testing distance, VisionTest transforms the traditional Tumbling E chart into an interactive digital workflow. The app estimates user distance with camera-based face tracking, calibrates screen PPI with a real-world reference card, and dynamically calculates the on-screen optotype size to keep the test closer to practical visual standards.

## Why VisionTest

- Makes preventive eyesight checks more convenient at home, in dorms, and in offices.
- Reduces the setup burden of traditional fixed-distance chart testing.
- Supports multiple response channels, including hand gestures, voice commands, and keyboard input.
- Adds monocular test compliance checks by detecting whether the correct eye is covered.
- Packages the experience for both browser-based use and desktop distribution with Wails.

## Features

- Dynamic Tumbling E scaling based on screen PPI and estimated user distance.
- Camera-assisted face tracking for distance estimation and head-position awareness.
- Monocular screening assistance with eye closure and hand-occlusion detection.
- Multi-modal interaction with gesture, voice, and keyboard responses.
- On-screen PPI calibration using a credit card, campus card, or ID-sized physical reference.
- Local bundled MediaPipe assets under `public/mediapipe` for project-controlled runtime delivery.
- Web and desktop application workflow powered by React, Vite, TypeScript, Go, and Wails.

![PPI calibration with physical reference cards](./dev/images/image-ppi-calibration.png)

## How It Works

1. The user calibrates the display using a real card-sized object to estimate screen PPI.
2. MediaPipe Face Landmarker estimates the face position and relative distance from the screen.
3. VisionTest computes the Tumbling E size from distance, visual acuity level, and calibrated PPI.
4. During monocular testing, the system checks whether the non-tested eye is properly covered or closed.
5. The user answers through gestures, speech, or keyboard input, and the app advances through acuity levels.

## Quick Start

> [!NOTE]
> The repository is configured with proxy mirrors to facilitate quick dependency installation in mainland China.

### Prerequisites

- Node.js 20 or later
- `pnpm`
- Go 1.25 or later
- Wails v3 CLI
- A webcam
- A Chromium-based browser is recommended for the web experience, especially when voice recognition is needed

### Install Dependencies

```bash
pnpm install
```

### Run the Frontend in a Browser

```bash
pnpm dev
```

### Build the Frontend

```bash
pnpm build
```

### Run the Desktop App in Development Mode

```bash
wails3 dev
```

### Build Desktop Packages

```bash
wails3 build
```

## Usage Flow

1. Open VisionTest and grant camera permission.
2. Complete PPI calibration with a real card-sized object.
3. Choose the eye to test and the preferred response mode.
4. Start the test and follow the on-screen or spoken instructions.
5. Review the resulting acuity score as a preventive reference only.

## Tech Stack

- Vision: MediaPipe Tasks Vision
- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4
- UI utilities: Lucide React, Motion, Sonner, Radix-based components
- Desktop shell: Wails v3
- Backend/runtime: Go

## Project Structure

```text
.
|-- public/                     Static assets and bundled MediaPipe models
|-- src/
|   |-- components/             Calibration, camera, and test UI
|   |-- lib/                    Vision math and utility logic
|   |-- App.tsx                 Main application shell
|-- build/                      Wails packaging and platform build config
|-- main.go                     Wails application entry
|-- app.go                      Go app scaffold
|-- Taskfile.yml                Development and release tasks
|-- package.json                Frontend scripts and dependencies
```

## Notes on Accuracy and Scope

- VisionTest is intended for preventive self-screening, not diagnosis.
- Actual accuracy depends on camera quality, lighting, user posture, screen calibration, and browser/device behavior.
- Voice input depends on browser speech recognition support.
- Test results should be treated as a convenience reference for daily monitoring.

## Contributing

Contributions are welcome. If you plan to improve the screening flow, interaction design, accessibility, or technical accuracy:

1. Fork the repository.
2. Create a feature branch.
3. Keep changes focused and explain the user-facing impact clearly.
4. Open a pull request with reproduction steps or screenshots when relevant.

## Support

- Open an issue for bugs, reproducible errors, or unclear behavior.
- Use discussions or issue threads for feature ideas and HCI design suggestions.
- For medical concerns, consult a qualified ophthalmology or optometry professional rather than relying on repository support.

## Maintainers

VisionTest is co-maintained by [@Chaotze](https://github.com/Chaotze), [@Aphrody](https://github.com/Aphrody-Dy) and [@qkq5](https://github.com/qkq5).

## License

This repository ships with the GNU Affero General Public License v3.0. See [LICENSE](./LICENSE) for details.

## Acknowledgements

- [MediaPipe Tasks Vision](https://github.com/google-ai-edge/mediapipe)
- [Wails](https://wails.io)
