# Hardcover Obsidian Plugin

This is an unofficial plugin for Obsidian that integrates with [Hardcover](https://hardcover.app), allowing you to manage and sync your book collection, notes, and reviews directly from your vault.

## 🚀 Features

- **Bookshelf Sync**: Fetches your entire Hardcover collection and generates a **native `.base` file** in Obsidian, providing a powerful database view with covers, progress, and status.
- **Automatic Book Notes**: Creates individual notes for each book with YAML frontmatter (ID, title, author, pages, status).
- **Review Sync (New!)**: 
    - Extracts your review from under the `## Notes` heading in your book notes.
    - **Smart Parser**: Converts Obsidian Markdown (Bold, Italic, Headings h1-h6, Lists) into Hardcover's native SlateJS format.
    - **Spoiler Support**: Use `<spoiler>text</spoiler>` tags to hide sensitive parts on the Hardcover website.
- **Sync Control Modal**: Before sending, a confirmation modal lets you set:
    - **Rating**: 1 to 5 stars.
    - **Spoilers**: Toggle if the review contains spoilers.
    - **Privacy**: Choose between **Public (Review)** or **Private (Notes)**.
- **Metadata Persistence**: The plugin saves `review_id`, `rating`, and `privacy` back to your note's frontmatter for future syncs.
- **Settings**: Flexible configuration for your API Key, bookshelf path, and book notes folder.

## 📂 Project Structure

The project follows a modular architecture for better maintainability:

```text
src/
├── api/             # GraphQL communication with Hardcover API
├── parsers/         # Markdown to SlateJS conversion logic
├── ui/              # Obsidian Modals and interface components
├── settings/        # Plugin settings tab management
└── types/           # TypeScript interfaces and constants
main.ts              # Entry point
src/plugin.ts        # Core plugin orchestration
```

## 🛠️ How to Use

1. **Setup**: Enter your Hardcover API key in the plugin settings.
2. **Import**: Run the `Fetch Hardcover Bookshelf` command to populate your vault.
3. **Write**: In a book note, write your thoughts under a `## Notes` heading. Use standard Markdown or `<spoiler>` tags.
4. **Sync**: Run the `Sync Hardcover Review` command.
5. **Confirm**: Set your rating and privacy in the modal and click **Sync Now**.

## 🏗️ Development

- **Language**: TypeScript
- **Tooling**: Built with `esbuild` for fast bundling.
- **API**: Uses the official Hardcover GraphQL API.

## 📝 TODO / Future Work

- [ ] Support for syncing highlights from Hardcover back to Obsidian.
- [ ] Direct status updates (Read/Reading) from Obsidian.
- [ ] Support for custom metadata fields.
- [ ] Improved error handling for network edge cases.

---

For more information about Hardcover, visit [https://hardcover.app](https://hardcover.app).
