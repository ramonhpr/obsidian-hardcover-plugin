export interface HardcoverPluginSettings {
    hardcoverApiKey: string;
    bookshelfFilePath?: string;
    bookNotesFolder?: string;
}

export const DEFAULT_SETTINGS: HardcoverPluginSettings = {
    hardcoverApiKey: '',
    bookshelfFilePath: 'bookshelf/index',
    bookNotesFolder: 'bookshelf/books'
};
