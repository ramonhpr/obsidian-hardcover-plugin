// hardcoverApi.ts
// Handles communication with the Hardcover API
import { requestUrl } from 'obsidian';

export interface HardcoverBook {
    id: string;
    title: string;
    image: { url: string };
    pages: number;
    contributions: { author: { name: string } }[];
    // Add more fields as needed
}

export interface HardcoverUser {
    id: string;
    username: string;
}

export async function fetchUserInfo(apiKey: string): Promise<HardcoverUser> {
    const query = `query GetMe { me { id username } }`;
    const response = await requestUrl({
        url: 'https://api.hardcover.app/v1/graphql',
        method: 'POST',
        headers: {
            'Authorization': `${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query,
            variables: {},
            operationName: 'GetMe'
        })
    });
    if (response.status !== 200) throw new Error('Failed to fetch user info');
    return response.json.data.me[0];
}

export async function fetchBooks(apiKey: string, userId: string): Promise<{ data: { books: HardcoverBook[] } }> {
    const query = `query BooksByUser($userId: Int!) { books(where: {user_books: {user_id: {_eq: $userId}}}) { image { url } id pages title contributions { author { name } } } }`;
    const variables = { userId: Number(userId) };
    const response = await requestUrl({
        url: 'https://api.hardcover.app/v1/graphql',
        method: 'POST',
        headers: {
            'Authorization': `${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query,
            variables,
            operationName: 'BooksByUser'
        })
    });
    if (response.status !== 200) throw new Error('Failed to fetch books');
    return response.json;
}

export async function createReviewPost(apiKey: string, bookId: string, content: string): Promise<{ success: boolean; reviewId?: string }> {
    // Use Obsidian's requestUrl to bypass CORS
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
