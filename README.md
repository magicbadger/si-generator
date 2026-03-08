# SI File Generator

A web-based wizard for creating conformant **SI.xml** files per [ETSI TS 102 818 v3.5.1](https://www.etsi.org/deliver/etsi_ts/102800_102899/102818/) for DAB/DAB+ digital radio services.

## Features

- **Guided 9-step wizard** — document metadata, service names, descriptions, bearers, logos, genre, keywords, links, and review
- **Multi-service support** — add and manage multiple services in a single SI.xml file
- **All bearer types** — DAB, DAB+, FM/RDS, IP audio stream, IP playlist, RadioDNS
- **Real-time validation** — ETSI TS 102 818 constraint checks with inline error messages and suggestions
- **Logo preview** — renders logos at their correct pixel dimensions
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

### Docker

```bash
docker-compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

## Usage

1. **Start** — click "Start new file" or drag an existing `SI.xml` onto the dropzone to import and edit it.
2. **Document Info (Step 0)** — set the service provider name, default language, and creation timestamp.
3. **Service Names (Step 1)** — enter the short (≤8 chars), medium (≤16 chars), and optional long name.
4. **Descriptions (Step 2)** — optional short (≤180 chars) and long (≤1200 chars) descriptions.
5. **Bearers (Step 3)** — add at least one bearer. Supported types:
   - **DAB / DAB+** — ECC, EId, SId, SCIdS; URI constructed automatically
   - **FM / RDS** — country code, PI code, frequency
   - **IP Audio Stream** — URL, MIME type, optional bitrate
   - **IP Playlist** — URL, DASH/HLS/PLS MIME type
   - **RadioDNS** — FQDN and service identifier for hybrid following
6. **Logos (Step 4)** — add logos by URL. Choose `logo_colour_square` (32×32), `logo_colour_rectangle` (112×32), or `logo_unrestricted` (custom size).
7. **Genre (Step 5)** — pick from common TV-Anytime ContentCS genres or enter a custom URN.
8. **Keywords (Step 6)** — comma-separated discovery terms.
9. **Links (Step 7)** — website or social media links with optional description and MIME type.
10. **Review & Export (Step 8)** — validate, preview XML, and download `SI.xml`.

Use the sidebar to jump between steps and switch between services at any time.

## Validation

The tool checks all constraints from ETSI TS 102 818 §7 before export:

| Rule | Check |
|------|-------|
| Short name ≤8 chars | Required; truncation warning |
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
| Framework | React 18 + Vite 5 + TypeScript |
| UI | Material UI v6 |
| State | Zustand (persisted to localStorage) |
| Validation | Zod + custom ETSI constraint checker |
| XML generation | xmlbuilder2 |
| XML parsing | fast-xml-parser |
| Container | nginx:alpine (static Vite build) |

## Project Structure

```
si-generator/
├── app/                        # React frontend
│   └── src/
│       ├── store/              # Zustand state (types + actions)
│       ├── lib/                # xmlGenerate, xmlIngest, validate, schemas
│       ├── steps/              # One component per wizard step (0–8)
│       ├── components/         # WizardShell, ProgressSidebar, BearerForm, etc.
│       └── constants/          # Genre URNs, MIME type lists
├── standards/
│   └── TS-102-818.md           # ETSI TS 102 818 spec summary
├── Dockerfile                  # Multi-stage: node build → nginx:alpine
├── docker-compose.yml
└── nginx.conf                  # SPA fallback: try_files → index.html
```
