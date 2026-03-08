import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, normalizePath, Modal, ButtonComponent } from 'obsidian';
import { createReviewPost, fetchBooks, fetchUserInfo } from './hardcoverApi';

// Remember to rename these classes and interfaces!

interface HardcoverPluginSettings {
    hardcoverApiKey: string;
    bookshelfFilePath?: string;
    bookNotesFolder?: string;
}

const DEFAULT_SETTINGS: HardcoverPluginSettings = {
    hardcoverApiKey: '',
    bookshelfFilePath: 'bookshelf/index',
    bookNotesFolder: 'bookshelf/books'
}

export default class HardcoverPlugin extends Plugin {
    settings: HardcoverPluginSettings;

    async onload() {
        await this.loadSettings();

        // Ribbon icon
        const ribbonIconEl = this.addRibbonIcon('book', 'Hardcover Plugin', (evt: MouseEvent) => {
            new Notice('Hardcover Plugin loaded!');
        });
        ribbonIconEl.addClass('hardcover-plugin-ribbon-class');

        // Status bar
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText('Hardcover Ready');

        // Command: Query book collection
        this.addCommand({
            id: 'hardcover-query-books',
            name: 'Query Hardcover Book Collection',
            callback: async () => {
                try {
                    // Fetch user info first
                    const user = await fetchUserInfo(this.settings.hardcoverApiKey);
                    if (!user?.id) {
                        new Notice('Could not fetch user info from Hardcover.');
                        return;
                    }
                    // Fetch books for the user
                    const response = await fetchBooks(this.settings.hardcoverApiKey, user.id);
                    const books = response.data.books;
                    new Notice(`Fetched ${books.length} books from Hardcover.`);

                    // Prepare paths
                    const filePath = this.settings.bookshelfFilePath?.trim() || 'bookshelf/index';
                    const normalizedPath = normalizePath(filePath + '.base');
                    const folderPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
                    if (folderPath && !this.app.vault.getAbstractFileByPath(folderPath)) {
                        await this.app.vault.createFolder(folderPath);
                    }
                    // Book notes folder
                    const bookNotesFolder = this.settings.bookNotesFolder?.trim() || 'bookshelf/books';
                    const bookNotesFolderPath = normalizePath(bookNotesFolder);
                    if (bookNotesFolderPath && !this.app.vault.getAbstractFileByPath(bookNotesFolderPath)) {
                        await this.app.vault.createFolder(bookNotesFolderPath);
                    }
                    let file = this.app.vault.getAbstractFileByPath(normalizedPath);
                    if (!file) {
                        // Create the file if it doesn't exist
                        await this.app.vault.create(normalizedPath, '');
                        file = this.app.vault.getAbstractFileByPath(normalizedPath);
                    }
                    if (file && file instanceof TFile) {
                        // Create Obsidian Bases file with proper structure
                        // .base files contain only the YAML configuration
                        
                        // Build the base content with Bases syntax
                        const baseContent = `filters:
  and:
    - file.inFolder("${bookNotesFolderPath}")
formulas:
  readingProgress: if(pages, (progress / pages * 100).round(1) + "%")
  "": image(cover)
  cover: image(cover)
properties:
  title:
    displayName: Title
  author:
    displayName: Author
  pages:
    displayName: Pages
  status:
    displayName: Status
  cover:
    displayName: Cover
  formula.readingProgress:
    displayName: Progress
views:
  - type: table
    name: All Books
    groupBy:
      property: status
      direction: ASC
    order:
      - file.name
      - author
      - pages
      - status
      - formula.
      - formula.readingProgress
    sort:
      - property: cover
        direction: DESC
      - property: file.name
        direction: DESC
    limit: 100
    rowHeight: extra
  - type: cards
    name: View
    order:
      - file.name
    cardSize: 210
    image: note.cover
    imageAspectRatio: 1.7
`;
                        
                        // Sort books by title
                        const sortedBooks = books.sort((a, b) => 
                            a.title.localeCompare(b.title)
                        );
                        
                        for (const book of sortedBooks) {
                            const author = book.contributions && book.contributions.length > 0 ? book.contributions[0].author.name : 'Unknown Author';
                            const bookNoteName = `${book.title.replace(/[/\\?%*:|"<>]/g, '_')}`;
                            const bookNotePath = `${bookNotesFolderPath}/${bookNoteName}.md`;
                            const status = book.user_books && book.user_books.length > 0 && book.user_books[0].user_book_status ? book.user_books[0].user_book_status.status : 'Unknown';
                            const progress = book.user_books && book.user_books.length > 0 && book.user_books[0].user_book_reads && book.user_books[0].user_book_reads.length > 0 ? book.user_books[0].user_book_reads[0].progress_pages || 0 : 0;
                            
                            // Create or update book note with Obsidian Bases properties
                            let bookNote = this.app.vault.getAbstractFileByPath(bookNotePath);
                            const bookNoteFrontmatter = `---
title: "${book.title}"
author: "${author}"
pages: ${book.pages || 0}
status: "${status}"
cover: "${book.image?.url || ''}"
progress: ${progress}
hardcover_id: ${book.id}
---

# ${book.title}

## Details
- **Author**: ${author}
- **Pages**: ${book.pages || 0}
- **Status**: ${status}
- **Cover**: ![Cover](${book.image?.url || ''})

## Notes
`;
                            if (!bookNote) {
                                await this.app.vault.create(bookNotePath, bookNoteFrontmatter);
                                bookNote = this.app.vault.getAbstractFileByPath(bookNotePath);
                            } else if (bookNote instanceof TFile) {
                                let noteContent = await this.app.vault.read(bookNote);
                                let restContent = '';
                                if (noteContent.startsWith('---')) {
                                    const fmEnd = noteContent.indexOf('---', 3);
                                    if (fmEnd !== -1) {
                                        restContent = noteContent.substring(fmEnd + 3).replace(/^\n+/, '');
                                    }
                                } else {
                                    restContent = noteContent;
                                }
                                restContent = restContent.replace(new RegExp(`^# ${book.title}\\s*`, 'm'), '');
                                noteContent = bookNoteFrontmatter + restContent;
                                await this.app.vault.modify(bookNote, noteContent);
                            }
                        }
                        
                        await this.app.vault.modify(file, baseContent);
                    }
                } catch (e) {
                    console.error(e);
                    new Notice('Failed to fetch books from Hardcover.');
                }
            }
        });

        // Command: Sync review post
        this.addCommand({
            id: 'hardcover-sync-review',
            name: 'Sync Hardcover Review',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice('No active file. Please open a book note to sync a review.');
                    return;
                }
                
                if (activeFile.extension !== 'md') {
                    new Notice('Active file must be a markdown note.');
                    return;
                }

                const cache = this.app.metadataCache.getFileCache(activeFile);
                if (!cache || !cache.frontmatter || !cache.frontmatter.hardcover_id) {
                    new Notice('Active note does not have a "hardcover_id" in its frontmatter.');
                    return;
                }

                const bookId = cache.frontmatter.hardcover_id;
                const apiKey = this.settings.hardcoverApiKey;
                const hasSpoilers = cache.frontmatter.contains_spoilers === true;

                if (!apiKey) {
                    new Notice('Please set your Hardcover API key in settings.');
                    return;
                }

                let content = await this.app.vault.read(activeFile);
                const notesRegex = /(?:^|\n)## Notes\s*\n([\s\S]*?)(?:\n#[^#]\s|$)/;
                const match = content.match(notesRegex);

                if (!match || !match[1].trim()) {
                    new Notice('No content found under "## Notes" to sync.');
                    return;
                }

                const reviewText = match[1].trim();
                const reviewId = cache.frontmatter.review_id;

                new SyncModal(this.app, async (rating: number, spoilers: boolean, privacy: 'public' | 'private') => {
                    try {
                        new Notice('Syncing review with Hardcover...');
                        const result = await createReviewPost(apiKey, bookId, reviewText, spoilers, reviewId, rating, privacy);
                        
                        const updatedReviewId = result.data?.update_user_book?.user_book?.id 
                            || result.data?.insert_user_book?.user_book?.id
                            || result.data?.update_user_book?.id
                            || result.data?.insert_user_book?.id;

                        if (updatedReviewId) {
                            await this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                                frontmatter.review_id = updatedReviewId;
                                frontmatter.rating = rating;
                                frontmatter.contains_spoilers = spoilers;
                                frontmatter.privacy = privacy;
                            });
                        }

                        new Notice('Successfully synced review to Hardcover!');
                    } catch(e) {
                        console.error(e);
                        new Notice('Sync Failed: ' + (e instanceof Error ? e.message : 'Check console'));
                    }
                }, {
                    rating: cache.frontmatter.rating || 0,
                    spoilers: hasSpoilers,
                    privacy: cache.frontmatter.privacy || 'public'
                }).open();
            }
        });

        // Settings tab
        this.addSettingTab(new HardcoverSettingTab(this.app, this));
    }

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class HardcoverSettingTab extends PluginSettingTab {
    plugin: HardcoverPlugin;

    constructor(app: App, plugin: HardcoverPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('Hardcover API Key')
            .setDesc('Enter your Hardcover API key')
            .addText(text => text
                .setPlaceholder('API Key')
                .setValue(this.plugin.settings.hardcoverApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.hardcoverApiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Bookshelf File Path')
            .setDesc('Enter the path for your bookshelf file (without .md). Default: bookshelf/index')
            .addText(text => text
                .setPlaceholder('bookshelf/index')
                .setValue(this.plugin.settings.bookshelfFilePath || 'bookshelf/index')
                .onChange(async (value) => {
                    this.plugin.settings.bookshelfFilePath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Books Notes Folder')
            .setDesc('Enter the folder for book notes. Default: bookshelf/books')
            .addText(text => text
                .setPlaceholder('bookshelf/books')
                .setValue(this.plugin.settings.bookNotesFolder || 'bookshelf/books')
                .onChange(async (value) => {
                    this.plugin.settings.bookNotesFolder = value;
                    await this.plugin.saveSettings();
                }));
    }
}
class SyncModal extends Modal {
    onSubmit: (rating: number, spoilers: boolean, privacy: 'public' | 'private') => void;
    defaults: { rating: number, spoilers: boolean, privacy: 'public' | 'private' };
    
    constructor(app: App, onSubmit: (rating: number, spoilers: boolean, privacy: 'public' | 'private') => void, defaults: { rating: number, spoilers: boolean, privacy: 'public' | 'private' }) {
        super(app);
        this.onSubmit = onSubmit;
        this.defaults = defaults;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Sync Review to Hardcover' });

        let rating = this.defaults.rating;
        let spoilers = this.defaults.spoilers;
        let privacy = this.defaults.privacy;

        new Setting(contentEl)
            .setName('Rating')
            .setDesc('Score from 1 to 5 stars')
            .addDropdown(dropdown => {
                dropdown.addOptions({
                    '0': 'No rating',
                    '1': '1 Star',
                    '2': '2 Stars',
                    '3': '3 Stars',
                    '4': '4 Stars',
                    '5': '5 Stars'
                });
                dropdown.setValue(String(rating));
                dropdown.onChange(value => { rating = Number(value); });
            });

        new Setting(contentEl)
            .setName('Contains Spoilers')
            .addToggle(toggle => {
                toggle.setValue(spoilers);
                toggle.onChange(value => { spoilers = value; });
            });

        new Setting(contentEl)
            .setName('Privacy')
            .addDropdown(dropdown => {
                dropdown.addOptions({
                    'public': 'Public (Review)',
                    'private': 'Private (Notes)'
                });
                dropdown.setValue(privacy);
                dropdown.onChange(value => { privacy = value as 'public' | 'private'; });
            });

        new Setting(contentEl)
            .addButton(btn => {
                btn.setButtonText('Sync Now')
                   .setCta()
                   .onClick(() => {
                        this.onSubmit(rating, spoilers, privacy);
                        this.close();
                   });
            });
    }

    onClose() {
        this.contentEl.empty();
    }
}
