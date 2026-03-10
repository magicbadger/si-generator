# SI File Generator

A web-based wizard for creating conformant **SI.xml** files per [ETSI TS 102 818 v3.5.1](https://www.etsi.org/deliver/etsi_ts/102800_102899/102818/) for DAB/DAB+ digital radio services.

## Features

- **Guided 10-step wizard** — document metadata, service names, descriptions, bearers, RadioDNS, logos, genre, keywords, links, and review
- **Multi-service support** — add and manage multiple services in a single SI.xml file
- **All bearer types** — DAB (DAB/DAB+ selected by MIME type), FM/RDS, IP audio stream, IP playlist
- **RadioDNS** — dedicated step for hybrid service-following lookup configuration
- **Logo Workshop** — generate all 5 standard sizes (32×32, 112×32, 128×128, 320×240, 600×600) from a single source image; choose between pixel resize or SVG vectorisation for crisp scaling
- **Self-hosted logo serving** — export a ready-to-run Docker package (nginx + logos + SI.xml) so you can host and verify your SI.xml and logos without any external infrastructure
- **Real-time validation** — ETSI TS 102 818 constraint checks with inline error messages
- **XML preview** — formatted XML output before download
- **Import/edit** — drag-and-drop an existing SI.xml to edit it; full round-trip fidelity
- **Persistent state** — progress is saved automatically in the browser (localStorage)

## Quick Start

### Local development

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Docker (the generator UI itself)

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

## Usage

1. **Start** — click "Start new file" or drag an existing `SI.xml` onto the dropzone to import and edit it.
2. **Document Info** — set the service provider name, default language, and creation timestamp.
3. **Service Names** — enter the short (≤8 chars), medium (≤16 chars), and optional long name.
4. **Descriptions** — optional short (≤180 chars) and long (≤1200 chars) descriptions.
5. **Bearers** — add at least one bearer. Supported types:
   - **DAB** — ECC, EId, SId, SCIdS; URI constructed automatically; MIME type selects DAB (`audio/mpeg`) or DAB+ (`audio/aacp`)
   - **FM / RDS** — country code, PI code, frequency
   - **IP Audio Stream** — URL, MIME type, optional bitrate
   - **IP Playlist** — URL, DASH/HLS/PLS MIME type
6. **RadioDNS** — optional FQDN and service identifier for hybrid service following.
7. **Logos** — open the Logo Workshop to generate all standard sizes from one source image:
   - Drop an image file or load from a URL
   - **Resize as-is** — canvas-scales the source to each standard size
   - **Vectorise to SVG** — traces the image to a resolution-independent SVG (using ImageTracer), then renders at each size for pixel-perfect results at any scale
   - Click any preview to open it full-size in a new tab; click "Add to service" to store it
8. **Genre** — pick from common TV-Anytime ContentCS genres or enter a custom URN. Drag to reorder; the top entry is always tagged `main`.
9. **Keywords** — comma-separated discovery terms.
10. **Links** — website or social media links with optional description and MIME type.
11. **Review & Export** — validate, preview XML, and download. Two export options:
    - **Download SI.xml** — the raw XML file (logo URLs must already be hosted)
    - **Export Docker Package** — generates a ZIP containing your logos, a `SI.xml` with real URLs, a `Dockerfile`, and an `nginx.conf`. Build and run it to self-host everything for testing and verification.

### Self-hosting with the Docker export

When you export the Docker package, you set the base URL the container will be reachable at (e.g. `http://192.168.1.100:8080`). The generated `SI.xml` has logo URLs pointing to that address. Then:

```bash
unzip si-docker-package.zip
cd si-docker-package
docker build -t si-logo-server .
docker run -p 8080:80 si-logo-server
```

Your SI.xml is served at `http://192.168.1.100:8080/SI.xml` and all logos are reachable at their declared URLs — ready to point a DAB receiver or RadioDNS client at for end-to-end verification.

## Validation

The tool checks all constraints from ETSI TS 102 818 §7 before export:

| Rule | Check |
|------|-------|
| Short name ≤8 chars | Required; warning if exceeded |
| Medium name ≤16 chars | Required |
| At least one bearer or RadioDNS | Per service |
| DAB bearer mimeValue | `audio/mpeg` (DAB) or `audio/aacp` (DAB+) |
| IP bearer mimeValue | Required |
| `logo_colour_square/rectangle` | Must not have width/height/mimeValue |
| `logo_unrestricted` | Must have width, height, and mimeValue |
| RadioDNS serviceIdentifier | 1–16 lowercase alphanumeric chars |

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | React 19 + Vite 7 + TypeScript |
| UI | Material UI v7 |
| State | Zustand 5 (persisted to localStorage) |
| Validation | Zod 4 + custom ETSI constraint checker |
| XML generation | Browser-native string builder (no Node.js deps) |
| XML parsing | fast-xml-parser |
| SVG vectorisation | ImageTracer.js |
| Drag and drop | @dnd-kit/sortable |
| ZIP packaging | JSZip |
| Container | nginx:alpine (static Vite build / logo server) |

## Project Structure

```
si-generator/
├── app/                        # React frontend
│   └── src/
│       ├── store/              # Zustand state (types + actions)
│       ├── lib/                # xmlGenerate, xmlIngest, validate, dockerExport
│       ├── steps/              # One component per wizard step (0–9)
│       ├── components/         # WizardShell, ProgressSidebar, BearerForm, LogoWorkshop, etc.
│       └── constants/          # Genre URNs, MIME type lists
├── standards/
│   ├── TS-102-818.md           # ETSI TS 102 818 spec summary
│   └── TS-103-270.md           # ETSI TS 103 270 (RadioDNS) spec summary
├── Dockerfile                  # Multi-stage: node build → nginx:alpine (generator UI)
├── docker-compose.yml
└── nginx.conf                  # SPA fallback: try_files → index.html
```
