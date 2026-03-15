# QR Studio

Frontend-only QR scanner and generator built with Next.js.

The app lets you:

- scan QR codes from the device camera
- generate QR codes for text, links, and video URLs
- preview scanned/generated payloads
- open links only when they pass local safety checks
- store scan and generation history in the browser

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- `html5-qrcode` for camera scanning
- `qrcode` for QR generation
- `lucide-react` for icons

## Features

### Scan

- live camera scanning in the browser
- decoded result preview
- clickable links when the URL looks safe
- video preview for supported direct media links and YouTube URLs

### Create

- create QR codes for:
  - plain text
  - links
  - video URLs
- download generated QR as PNG
- copy raw payload

### History

- keeps recent scans and generated codes
- stored locally with `localStorage`
- no backend or database required

### Info

- explains the simplified safety model
- documents how the frontend-only version works

## Safety Model

This project does not use a backend, so it cannot do real reputation or malware analysis for links.

Instead, it uses a simple browser-side heuristic:

- only `https` URLs are considered openable
- localhost and private network hosts are blocked
- punycode-style domains are blocked
- invalid or suspicious URLs stay non-clickable

This is a UX safeguard, not a full security system.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Build

```bash
npm run lint
npm run build
```

## Project Structure

```text
src/
  app/
    globals.css
    layout.tsx
    page.tsx
  components/
    qr-studio.tsx
  lib/
    qr-utils.ts
```

## Notes

- camera scanning requires browser camera permission
- best experience is on modern Chromium, Safari, and Firefox versions
- history is device-local and will be cleared if browser storage is cleared
- some video providers may block embedding depending on their own policies

## Deploy

The project can be deployed as a standard Next.js app on platforms like Vercel.

```bash
npm run build
```

Then connect the repository to your hosting provider and deploy the `main` branch.
