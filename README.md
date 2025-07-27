# Hardcover Obsidian Plugin

This is an unofficial plugin for Obsidian that integrates with [Hardcover](https://hardcover.app), allowing you to manage and view your Hardcover book collection directly in your vault.

## Features

- Adds a ribbon icon to quickly access plugin features.
- Adds a status bar item indicating plugin readiness.
- Adds a settings tab to configure your Hardcover API key, bookshelf index file, and book notes folder.
- Fetches your Hardcover book collection and displays it in a markdown table in a single index note (default: `bookshelf/index.md`).
- Each book is shown with:
  - Cover image (uniform size)
  - Title (links to a dedicated book note)
  - Author (as a wiki link)
  - Number of pages
  - Reading status (e.g., "Read", "Reading", "Want to Read")
- Prevents duplicate book entries in the index note when fetching multiple times.
- For each book, creates a dedicated note (in a configurable folder, default: `bookshelf/books`):
  - Note contains YAML frontmatter with author, pages, and status
  - Note contains a single H1 heading with the book title
  - Frontmatter and heading are updated if the note already exists (no duplication)
- All folders and files are created automatically if they do not exist.
- Book notes and the index table stay in sync with your Hardcover collection.

## How to Use

1. Install the plugin in your Obsidian vault.
2. Open the settings tab for "Hardcover Obsidian Plugin".
3. Enter your Hardcover API key.
4. Optionally, set the bookshelf index file path and the folder for book notes.
5. Use the command palette to run "Query Hardcover Book Collection".
6. Your collection will be fetched and organized in your vault.

## Development

- Written in TypeScript and uses the latest Obsidian API.
- See `main.ts` and `hardcoverApi.ts` for implementation details.

---

For more information about Hardcover, visit [https://hardcover.app](https://hardcover.app).
