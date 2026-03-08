import { App, Modal, Setting } from 'obsidian';
import { ReviewPrivacy } from '../types/hardcover';

export class SyncModal extends Modal {
    onSubmit: (rating: number, spoilers: boolean, privacy: ReviewPrivacy) => void;
    defaults: { rating: number, spoilers: boolean, privacy: ReviewPrivacy };
    
    constructor(app: App, onSubmit: (rating: number, spoilers: boolean, privacy: ReviewPrivacy) => void, defaults: { rating: number, spoilers: boolean, privacy: ReviewPrivacy }) {
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
                dropdown.onChange(value => { privacy = value as ReviewPrivacy; });
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
