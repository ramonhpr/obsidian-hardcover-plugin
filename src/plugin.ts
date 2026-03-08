import { App, Notice, Plugin, TFile, normalizePath } from 'obsidian';
import { fetchBooks, fetchUserInfo, createReviewPost } from './api/hardcover-api';
import { HardcoverPluginSettings, DEFAULT_SETTINGS } from './types/settings';
import { HardcoverSettingTab } from './settings/settings-tab';
import { SyncModal } from './ui/sync-modal';

export class HardcoverPlugin extends Plugin {
    settings: HardcoverPluginSettings;

    async onload() {
        await this.loadSettings();

        // Ribbon icon
        this.addRibbonIcon('book', 'Hardcover Plugin', () => {
            new Notice('Hardcover Plugin is ready!');
        });

        // Command: Fetch Bookshelf
        this.addCommand({
            id: 'hardcover-fetch-bookshelf',
            name: 'Fetch Hardcover Bookshelf',
            callback: async () => {
                const apiKey = this.settings.hardcoverApiKey;
                if (!apiKey) {
                    new Notice('Please set your Hardcover API key in settings.');
                    return;
                }

                try {
                    new Notice('Fetching user info...');
                    const user = await fetchUserInfo(apiKey);
                    new Notice(`Hello, ${user.username}! Fetching books...`);

                    const result = await fetchBooks(apiKey, user.id);
                    const books = result.data.books;

                    const bookshelfPath = normalizePath((this.settings.bookshelfFilePath || 'bookshelf/index') + '.base');
                    const bookNotesFolderPath = this.settings.bookNotesFolder || 'bookshelf/books';

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
      - formula.readingProgress
    sort:
      - property: cover
        direction: DESC
      - property: file.name
        direction: DESC
    limit: 100
    rowHeight: extra
  - type: cards
    name: Gallery
    order:
      - file.name
    cardSize: 210
    image: note.cover
    imageAspectRatio: 1.7
`;

                    const bookshelfFolder = bookshelfPath.split('/').slice(0, -1).join('/');
                    if (bookshelfFolder && !this.app.vault.getAbstractFileByPath(bookshelfFolder)) {
                        await this.app.vault.createFolder(bookshelfFolder);
                    }

                    const existingFile = this.app.vault.getAbstractFileByPath(bookshelfPath);
                    if (existingFile instanceof TFile) {
                        await this.app.vault.modify(existingFile, baseContent);
                    } else {
                        await this.app.vault.create(bookshelfPath, baseContent);
                    }

                    new Notice(`Updated bookshelf with ${books.length} books! Creating individual notes...`);

                    const bookNotesFolder = normalizePath(this.settings.bookNotesFolder || 'bookshelf/books');
                    if (!this.app.vault.getAbstractFileByPath(bookNotesFolder)) {
                        await this.app.vault.createFolder(bookNotesFolder);
                    }

                    for (const book of books) {
                        const bookPath = normalizePath(`${bookNotesFolder}/${book.title.replace(/[\\/:*?"<>|]/g, '')}.md`);
                        const authors = book.contributions.map(c => c.author.name).join(', ');
                        
                        const userBook = book.user_books?.[0];
                        const progress = userBook?.user_book_reads?.[0]?.progress_pages || 0;
                        const coverUrl = book.image?.url || '';

                        const bookNoteFrontmatter = `---
hardcover_id: ${book.id}
title: "${book.title}"
author: "${authors}"
pages: ${book.pages}
status: ${userBook?.user_book_status?.status || ''}
progress: ${progress}
cover: "${coverUrl}"
---
`;
                        const bookNoteContent = `${bookNoteFrontmatter}\n# ${book.title}\n\n![Cover](${book.image?.url})\n\n## Notes\n\n`;

                        const bookFile = this.app.vault.getAbstractFileByPath(bookPath);
                        if (!(bookFile instanceof TFile)) {
                            await this.app.vault.create(bookPath, bookNoteContent);
                        } else {
                            let existingContent = await this.app.vault.read(bookFile);
                            if (!existingContent.includes('hardcover_id:')) {
                                const newContent = bookNoteFrontmatter + existingContent.replace(/^---[\s\S]*?---/, '');
                                await this.app.vault.modify(bookFile, newContent);
                            }
                        }
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
                if (!activeFile || activeFile.extension !== 'md') {
                    new Notice('Please open a book note to sync a review.');
                    return;
                }

                const cache = this.app.metadataCache.getFileCache(activeFile);
                if (!cache || !cache.frontmatter || !cache.frontmatter.hardcover_id) {
                    new Notice('Active note does not have a "hardcover_id" in its frontmatter.');
                    return;
                }

                const bookId = cache.frontmatter.hardcover_id;
                const apiKey = this.settings.hardcoverApiKey;
                if (!apiKey) {
                    new Notice('Please set your Hardcover API key in settings.');
                    return;
                }

                const content = await this.app.vault.read(activeFile);
                const notesRegex = /(?:^|\n)## Notes\s*\n([\s\S]*?)(?:\n#[^#]\s|$)/;
                const match = content.match(notesRegex);

                if (!match || !match[1].trim()) {
                    new Notice('No content found under "## Notes" to sync.');
                    return;
                }

                const reviewText = match[1].trim();
                const reviewId = cache.frontmatter.review_id;

                new SyncModal(this.app, async (rating, spoilers, privacy) => {
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
                    spoilers: cache.frontmatter.contains_spoilers === true,
                    privacy: cache.frontmatter.privacy || 'public'
                }).open();
            }
        });

        this.addSettingTab(new HardcoverSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
