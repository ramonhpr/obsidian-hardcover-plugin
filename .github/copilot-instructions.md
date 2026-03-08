# Copilot Instructions for Hardcover Obsidian Plugin

## Project Overview
This plugin integrates [Hardcover](https://hardcover.app) with Obsidian. It synchronizes your book collection into a **native Obsidian Base (.base)** file and allows syncing reviews directly from Obsidian notes back to Hardcover.

## 📂 Modular Architecture
The project is structured into functional modules under `src/` to ensure maintainability:

- `main.ts`: Entry point. Very lightweight, simply exports the `HardcoverPlugin` class.
- `src/plugin.ts`: Core orchestration. Registers commands, manages file creation, and bookshelf fetching logic.
- `src/api/hardcover-api.ts`: Pure API communication using GraphQL. Handles user info, book list fetching, and review posting (Update/Insert).
- `src/parsers/slate-parser.ts`: **Critical Logic**. Converts Obsidian Markdown (Bold, Italic, Headings h1-h6, Lists, Spoilers) into the SlateJS JSON format required by Hardcover.
- `src/ui/sync-modal.ts`: Confirmation modal for review syncing (Rating, Spoilers, Privacy).
- `src/settings/settings-tab.ts`: Management of the plugin settings interface.
- `src/types/`: Interfaces for Hardcover data, settings, and internal state.

## 🚀 Key Features & Patterns

### 📋 Local Database (.base)
- The plugin generates a `.base` file (Obsidian's native database view).
- It uses a YAML configuration that filters notes in the `bookshelf/books` folder.
- Custom formulas are used for progress calculation.

### ✍️ Review Syncing
- Extracts content from the `## Notes` section of a book note.
- **Markdown to Slate**: The parser handles complex formatting:
    - `**Bold**`, `*Italic*`, `_Italic_`.
    - `# Heading 1` to `###### Heading 6` map to `heading-one` through `heading-six`.
    - `- List` and `* List` become separate blocks.
    - `<spoiler>text</spoiler>` tags are preserved as Slate spoiler objects.
- **Privacy Mode**: Public sync uses `review_slate`; Private sync uses `private_notes`.

### 🗃️ Metadata Persistence
- Individual book notes (`.md`) store critical sync data in frontmatter:
    - `hardcover_id`: The book's unique ID on Hardcover.
    - `review_id`: The ID of the user's review record (for updates).
    - `rating`, `progress`, `cover`, `privacy`.

## 🛠️ Developer Workflows
- **Build**: 
  - Dev: `npm run dev` (watches `main.ts` and imports).
  - Production: `npm run build`.
- **Note on Circular Dependencies**: Avoid importing `HardcoverPlugin` from `main.ts` in sub-modules; import it from `src/plugin.ts` instead.

## 💡 Tips for AI Agents
- **Modularity**: Never add business logic to `main.ts`. New features should go into `src/plugin.ts` or a relevant sub-directory.
- **Bases Schema**: The `.base` file is YAML-only. If changing its layout, ensure the YAML is valid for the Obsidian Bases plugin.
- **Slate Parser**: When modifying formatting, update `src/parsers/slate-parser.ts`. Ensure `flushParagraph` and `flushText` are called correctly to maintain valid SlateJS nesting.
- **Metadata**: Always use `app.fileManager.processFrontMatter` to update note properties safely.

---
For questions or unclear sections, ask the user for clarification or check the `hardcover_graphql_mutations` artifact in the brain folder.
