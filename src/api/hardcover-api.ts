import { requestUrl } from 'obsidian';
import { HardcoverBook, HardcoverUser, ReviewPrivacy, ReviewPostResult } from '../types/hardcover';
import { parseMarkdownToSlate } from '../parsers/slate-parser';

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
    const query = `
	  query BooksByUser($userId: Int!) {
		books(where: {user_books: {user_id: {_eq: $userId}}}, order_by: {title: desc}) {
		  image { url }
		  id
		  pages
		  title
		  contributions { author { name } }
		  user_books(where: {user: {id: {_eq: $userId}}}) {
			user_book_status {
			  status
			}
			user_book_reads {
			  progress_pages
			}
		  }
		}
	  }
	`;
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

export async function createReviewPost(
    apiKey: string, 
    bookId: string, 
    content: string, 
    hasSpoilers: boolean, 
    reviewId?: number, 
    rating?: number, 
    privacy: ReviewPrivacy = 'public'
): Promise<ReviewPostResult> {
    const reviewSlate = parseMarkdownToSlate(content);
    const userBookId = reviewId ? Number(reviewId) : null;
    
    const variables: any = {
        bookId: Number(bookId),
        reviewSlate: privacy === 'public' ? reviewSlate : null,
        privateNotes: privacy === 'private' ? content : null,
        rating: rating || null,
        hasSpoilers: hasSpoilers
    };

    let mutationQuery = "";
    if (userBookId) {
        mutationQuery = `
          mutation UpdateReview($id: Int!, $reviewSlate: jsonb, $privateNotes: String, $rating: numeric, $hasSpoilers: Boolean) {
            update_user_book(
              id: $id,
              object: {
                review_slate: $reviewSlate,
                private_notes: $privateNotes,
                rating: $rating,
                review_has_spoilers: $hasSpoilers,
                reviewed_at: "now()"
              }
            ) {
              user_book { id }
              id
              error
            }
          }
        `;
        variables.id = userBookId;
        delete variables.bookId;
    } else {
        mutationQuery = `
          mutation InsertReview($bookId: Int!, $reviewSlate: jsonb, $privateNotes: String, $rating: numeric, $hasSpoilers: Boolean) {
            insert_user_book(
              object: {
                book_id: $bookId,
                review_slate: $reviewSlate,
                private_notes: $privateNotes,
                rating: $rating,
                review_has_spoilers: $hasSpoilers,
                reviewed_at: "now()"
              }
            ) {
              user_book { id }
              id
              error
            }
          }
        `;
    }

    const response = await requestUrl({
        url: 'https://api.hardcover.app/v1/graphql',
        method: 'POST',
        headers: {
            'Authorization': `${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: mutationQuery,
            variables,
            operationName: userBookId ? 'UpdateReview' : 'InsertReview'
        })
    });

    if (response.status !== 200) throw new Error('Failed to create review post');
    const result = response.json as ReviewPostResult;
    if (result.errors && result.errors.length > 0) {
        throw new Error('GraphQL Error: ' + result.errors[0].message);
    }
    console.debug(result);
    return result;
}
