// hardcoverApi.ts
// Handles communication with the Hardcover API
import { requestUrl } from 'obsidian';

export interface HardcoverBook {
    id: string;
    title: string;
    author: string;
    // Add more fields as needed
}

export async function fetchBooks(apiKey: string): Promise<HardcoverBook[]> {
    // Use Obsidian's requestUrl to bypass CORS
    const response = await requestUrl({
        url: 'https://api.hardcover.app/v1/graphql',
        method: 'POST',
        headers: {
            'Authorization': `${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({"query":"query MyQuery {\n  books(where: {user_books: {user_id: {_eq: ID}}}) {\n    image {\n        url\n      }\n      pages\n      title\n  }\n}\n","operationName":"MyQuery"})
    });
    if (response.status !== 200) throw new Error('Failed to fetch books');
    return response.json;
}

export async function createReviewPost(apiKey: string, bookId: string, content: string): Promise<any> {
    // Use Obsidian's requestUrl to bypass CORS
    const x ='x';
	const response = await requestUrl({
        url: `https://api.hardcover.app/v1/books/${bookId}/reviews`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
    });
    if (response.status !== 200) throw new Error('Failed to create review post');
    return response.json;
}
