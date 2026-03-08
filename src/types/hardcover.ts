export interface HardcoverBook {
    id: string;
    title: string;
    image: { url: string };
    pages: number;
    contributions: { author: { name: string } }[];
    user_books: {
        user_book_status?: { status: string };
        user_book_reads?: { progress_pages?: number }[];
    }[];
}

export interface HardcoverUser {
    id: string;
    username: string;
}

export type ReviewPrivacy = 'public' | 'private';

export interface ReviewPostResult {
    data?: {
        insert_user_book?: { id: number, user_book?: { id: number }, error?: string };
        update_user_book?: { id: number, user_book?: { id: number }, error?: string };
    };
    errors?: { message: string }[];
}
