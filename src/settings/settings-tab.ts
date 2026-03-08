import { App, PluginSettingTab, Setting } from 'obsidian';
import { HardcoverPlugin } from '../plugin';

export class HardcoverSettingTab extends PluginSettingTab {
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
