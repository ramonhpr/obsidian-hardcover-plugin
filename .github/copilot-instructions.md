# Copilot Instructions for Hardcover Obsidian Plugin

## Project Overview
This plugin integrates [Hardcover](https://hardcover.app) with Obsidian, allowing users to manage their book collection directly in their vault. It fetches book data from Hardcover, creates/updates index and book notes, and keeps everything in sync.

## Architecture & Key Files
- `main.ts`: Entry point. Registers commands, ribbon icon, status bar, and settings tab. Handles book fetching, note creation/updating, and table generation.
- `hardcoverApi.ts`: Handles all API communication with Hardcover (GraphQL queries, review posting).
- `esbuild.config.mjs`: Build script. Use `npm run build` for production or `npm run dev` for development (watches for changes).
- `package.json`: Defines build/test/version scripts and dependencies.
- `manifest.json`, `styles.css`: Obsidian plugin metadata and styles.

## Developer Workflows
- **Build:**
  - Development: `npm run dev` (watches and rebuilds on changes)
  - Production: `npm run build` (type-checks, bundles, minifies)
- **Version bump:** `npm run version` (updates manifest and versions.json)
- **No automated tests** are present; manual testing in Obsidian is required.

## Patterns & Conventions
- **Settings:** API key, index file path, and book notes folder are user-configurable via the settings tab.
- **File/Folder Creation:** All required folders/files are auto-created if missing.
- **Book Notes:**
  - Created/updated per book, with YAML frontmatter and H1 title.
  - Frontmatter and heading are updated if the note exists (no duplication).
- **Index Table:**
  - Markdown table in index note, with cover image, title (links to book note), author (wiki link), pages, and status.
  - Prevents duplicate entries using hidden HTML comments (`<!-- hardcover-id:... -->`).
- **API Integration:**
  - Uses Obsidian's `requestUrl` for all network requests.
  - GraphQL queries for user and book data; REST for review posting.

## External Dependencies
- Relies on Obsidian API and Hardcover API.
- Uses TypeScript, esbuild, and some Codemirror/Electron modules (externalized in build).

## Example: Adding a Book
- Fetches user info and books from Hardcover.
- For each book:
  - Creates/updates book note in configured folder.
  - Updates index table, avoiding duplicates.

## Tips for AI Agents
- Always check/update both index and book notes for sync.
- Use settings from `main.ts` and update via the settings tab logic.
- Follow the file/folder creation logic to avoid errors.
- Reference `hardcoverApi.ts` for API patterns and error handling.

---
For questions or unclear sections, ask the user for clarification or examples from their workflow.
