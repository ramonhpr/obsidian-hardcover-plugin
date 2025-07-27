import { App, Editor, Notice, Plugin, PluginSettingTab, Setting, TFile, normalizePath } from 'obsidian';
import { fetchBooks, createReviewPost, fetchUserInfo } from './hardcoverApi';

// Remember to rename these classes and interfaces!

interface HardcoverPluginSettings {
    hardcoverApiKey: string;
    bookshelfFilePath?: string;
}

const DEFAULT_SETTINGS: HardcoverPluginSettings = {
    hardcoverApiKey: '',
    bookshelfFilePath: 'bookshelf/index'
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
                    console.log(books);
                    new Notice(`Fetched ${books.length} books from Hardcover.`);

                    // Determine file path from settings or use default
                    const filePath = this.settings.bookshelfFilePath?.trim() || 'bookshelf/index';
                    const normalizedPath = normalizePath(filePath + '.md');
                    const folderPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
                    if (folderPath && !this.app.vault.getAbstractFileByPath(folderPath)) {
                        await this.app.vault.createFolder(folderPath);
                    }
                    let file = this.app.vault.getAbstractFileByPath(normalizedPath);
                    if (!file) {
                        // Create the file if it doesn't exist
                        await this.app.vault.create(normalizedPath, '');
                        file = this.app.vault.getAbstractFileByPath(normalizedPath);
                    }
                    if (file && file instanceof TFile) {
                        // Only add books that are not already in the file
                        const existingContent = await this.app.vault.read(file);
                        let newRows = '';
                        books.forEach(book => {
                            const author = book.contributions && book.contributions.length > 0 ? book.contributions[0].author.name : 'Unknown Author';
                            const bookIdTag = `<!-- hardcover-id:${book.id} -->`;
                            if (!existingContent.includes(bookIdTag)) {
                                newRows += `| <img src=\"${book.image.url}\" alt=\"${book.title}\" width=\"120\" height=\"180\" style=\"object-fit:cover;\" /> | **${book.title}** | [[${author}]] | ${book.pages} ${bookIdTag} |\n`;
                            }
                        });
                        // Table header
                        const tableHeader = `| Cover | Title | Author | Pages |\n|:-----:|:------|:-------|:------:|\n`;
                        let newContent = existingContent;
                        if (!existingContent.includes('| Cover | Title | Author | Pages |')) {
                            // Table does not exist, create it
                            newContent += tableHeader + newRows;
                        } else if (newRows) {
                            // Table exists, append new rows just after the header
                            const lines = existingContent.split('\n');
                            const headerIdx = lines.findIndex(line => line.includes('| Cover | Title | Author | Pages |'));
                            const dividerIdx = headerIdx + 1;
                            // Insert after divider
                            lines.splice(dividerIdx + 1, 0, newRows.trim());
                            newContent = lines.join('\n');
                        }
                        if (newRows) {
                            await this.app.vault.modify(file, newContent);
                        } else {
                            new Notice('No new books to add.');
                        }
                    }
                } catch (e) {
                    console.error(e);
                    new Notice('Failed to fetch books from Hardcover.');
                }
            }
        });

        // Command: Create review post
        this.addCommand({
            id: 'hardcover-create-review',
            name: 'Create Hardcover Review Post',
            callback: async () => {
                // This is a placeholder. You would add logic to select a book and get note content.
                new Notice('Feature not implemented: select a book and create a review post.');
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
    }
}
