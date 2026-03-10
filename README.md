# Markdown Viewer

A lightweight local web app for viewing multiple markdown files simultaneously in browser tabs with live reload.

Built as an alternative to VS Code's single-file markdown preview and aging desktop apps like MacDown/Mark Text.

![UI Layout](https://img.shields.io/badge/UI-Sidebar%20%2B%20Tabs-blue) ![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)

## Features

- **Multi-file tabs** — open multiple `.md` files side by side, each in its own tab
- **Live reload** — edit a file in any editor, preview updates instantly via WebSocket
- **Sidebar file tree** — browse and open files from a collapsible, resizable directory tree
- **Open any file** — click "Open File" to launch a native macOS Finder dialog and link files from anywhere on your system
- **Upload files** — drag & drop or click to upload `.md` files
- **Search** — search across all files with instant results and context snippets
- **LaTeX math** — renders `$inline$` and `$$block$$` math via KaTeX
- **Syntax highlighting** — code blocks highlighted via highlight.js
- **GitHub-style rendering** — clean, familiar markdown styling with task lists, tables, blockquotes

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)

### Setup

```bash
git clone https://github.com/qingpengliu0823/markdown-viewer.git
cd markdown-viewer
npm install
```

### Run

**Option A — macOS Desktop App (recommended)**

Double-click `Markdown Viewer.app`. It starts the server and opens your browser automatically. Drag it to your Dock for quick access.

> First time: macOS may ask you to allow the app. Right-click > Open if needed.

**Option B — Terminal**

```bash
npm start                    # serves the project directory
npm start /path/to/notes     # serves a specific folder
```

Then open [http://localhost:3000](http://localhost:3000).

## Usage

| Action | How |
|--------|-----|
| Browse files | Click files in the sidebar |
| Open external file | Click **Open File** — opens native Finder dialog |
| Upload files | Click **Upload** or drag & drop onto the main area |
| Close a tab | Click the **x** on the tab |
| Delete a file | Hover over a file in the sidebar, click **x** |
| Search | Type in the search box — results appear instantly |
| Resize sidebar | Drag the right edge of the sidebar |
| Hide/show sidebar | Click the chevron in the sidebar header |

## Tech Stack

- **Backend**: Node.js, Express, ws (WebSocket), chokidar (file watcher)
- **Frontend**: Vanilla JS, markdown-it, KaTeX, highlight.js
- **No build step** — all frontend code is plain JS served as static files

## License

MIT
