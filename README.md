# SI File Generator

A web-based tool for creating, editing, and exporting conformant **SI.xml** files per [ETSI TS 102 818 v3.5.1](https://www.etsi.org/deliver/etsi_ts/102800_102899/102818/) for DAB/DAB+ digital radio services with hybrid radio (RadioDNS) support.

## Features

### Authoring
- **Document metadata** — service provider names (short/medium/long), descriptions, logos, default language, creation time, originator
- **Multi-service support** — manage multiple services in a single SI.xml file via a flat sidebar list
- **All bearer types** — DAB/DAB+ (MIME type selects codec), FM/RDS, IP audio stream, IP playlist; cost ordering
- **GCC/ECC helper** — country dropdown computes the correct GCC from ECC + EId/PI country nibble for both DAB and FM; warns when GCC and EId/PI are inconsistent
- **RadioDNS** — FQDN and service identifier for hybrid service-following lookup
- **Logo Workshop** — generate all 5 standard sizes (32×32, 112×32, 128×128, 320×240, 600×600) from a single source image via pixel resize or SVG vectorisation
- **Genre** — TV-Anytime ContentCS URN picker (main + secondary)
- **Keywords and links**

### Import
- **Drag & drop or browse** an existing SI.xml to load and edit it; full round-trip fidelity
- **Retrieve from broadcast** via RadioDNS — enter DAB (GCC/EId/SId/SCIdS), FM (GCC/PI/frequency), or a direct authoritative FQDN; resolves CNAME and SRV records via DNS-over-HTTPS and fetches the live SI.xml
- Imported source URL shown as a chip in the header; click to view the raw XML

### Export
- **Download SI.xml** — conformant XML, ready to serve
- **Preview XML** — view formatted output before downloading
- **Validate** — checks all ETSI TS 102 818 constraints with inline error messages
- **Export Folder** — ZIP with `SI.xml` + `logos/` directory, ready to upload to a web server; embedded logo `data:` URIs are resolved to real URLs at a configurable base URL
- **Export Docker Package** — self-contained ZIP with SI.xml, logos, Dockerfile, and nginx config for local hosting and end-to-end verification
- **Export Zone File** — DNS zone file with CNAME records for all DAB and FM bearers (both full-GCC and ECC-only variants), suitable for RadioDNS registration

## Quick Start

### Docker (recommended)

```bash
# Production build on port 8080
docker compose up si-generator

# Development server with hot-module reload on port 5173
docker compose up dev
```

### Without Docker

```bash
cd app
npm install
npm run dev   # → http://localhost:5173
```

## Usage

1. **Start** — click "Start new file" on the home screen, or drag an existing `SI.xml` onto the dropzone to import and edit it. You can also click "Retrieve from broadcast" to pull a live SI.xml via RadioDNS.

2. **Document Info** — set service provider names and descriptions, upload logos, choose the default language and creation timestamp.

3. **Add a service** — click the `+` button in the sidebar. Each service has tabs for:
   - **Names** — short (≤8 chars), medium (≤16 chars), optional long name
   - **Descriptions** — optional short (≤180 chars) and long (≤1200 chars)
   - **Bearers** — at least one required; DAB, FM, IP stream, or IP playlist
   - **RadioDNS** — optional FQDN + service identifier
   - **Logos** — open Logo Workshop; add by URL or upload
   - **Genre / Keywords / Links**

4. **Review & Export** — export buttons appear at the top. Validate first, then download in your preferred format.

### Self-hosting with the Docker export

```bash
unzip si-docker-package.zip -d si-server
cd si-server
docker build -t si-logo-server .
docker run -p 8080:80 si-logo-server
# SI.xml → http://localhost:8080/SI.xml
```

Set the base URL to wherever the container will be reachable (e.g. `http://192.168.1.100:8080`) before exporting — logo URLs in the generated SI.xml will point there.

## Validation rules

| Rule | Check |
|------|-------|
| Short name | Required; ≤8 chars |
| Medium name | Required; ≤16 chars |
| At least one bearer or RadioDNS | Per service |
| DAB bearer `mimeValue` | `audio/mpeg` (DAB) or `audio/aacp` (DAB+) |
| IP bearer `mimeValue` | Required |
| IP bearer URI scheme | Must be `http://` or `https://` |
| `logo_colour_square/rectangle` | Must not have width/height/mimeValue |
| `logo_unrestricted` | Must have width, height, and mimeValue |
| RadioDNS `serviceIdentifier` | 1–16 lowercase alphanumeric chars |

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | React 19 + Vite 7 + TypeScript (strict) |
| UI | Material UI v7 |
| State | Zustand 5 (persisted to localStorage) |
| XML generation | Browser-native string builder |
| XML parsing | fast-xml-parser |
| DNS lookups | Cloudflare DNS-over-HTTPS |
| SVG vectorisation | ImageTracer.js |
| ZIP packaging | JSZip |
| Container | nginx:alpine |

## Project Structure

```
si-generator/
├── app/                        # React frontend
│   └── src/
│       ├── components/         # WizardShell, ProgressSidebar, BearerForm,
│       │                       # LogoWorkshop, RadioDnsRetrieve, etc.
│       ├── constants/          # ECC/GCC table, genre URNs, MIME type lists
│       ├── lib/                # xmlGenerate, xmlIngest, validate,
│       │                       # radiodnsLookup, dockerExport,
│       │                       # zonefileGenerate, download
│       ├── steps/              # One component per wizard step
│       └── store/              # Zustand store, types, actions
├── standards/
│   └── TS-102-818.md           # ETSI TS 102 818 spec summary (agent reference)
├── Dockerfile                  # Multi-stage: node build → nginx:alpine
├── docker-compose.yml          # Production + dev services
└── nginx.conf
```

## Standards

- **ETSI TS 102 818 v3.5.1** — Service and Programme Information for DAB
- **ETSI TS 102 370** — RadioDNS hybrid radio resolution
- **ETSI TS 101 756** — ECC/GCC country codes
