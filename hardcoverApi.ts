// hardcoverApi.ts
// Handles communication with the Hardcover API
import { requestUrl } from 'obsidian';

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

export async function createReviewPost(apiKey: string, bookId: string, content: string, hasSpoilers: boolean): Promise<any> {
    const slateChildren: any[] = [];
    const lines = content.split('\n');
    lines.forEach((line, index) => {
        if (line.length > 0) {
            slateChildren.push({ text: line, object: "text" });
        }
        if (index < lines.length - 1) {
            slateChildren.push({ data: {}, type: "br", object: "inline", children: [] });
        }
    });

    const reviewSlate = {
        document: {
            object: "document",
            children: [
                {
                    data: {},
                    type: "paragraph",
                    object: "block",
                    children: slateChildren
                }
            ]
        }
    };

    // First check if the user_book already exists
    const checkQuery = `
      query CheckUserBook($bookId: Int!) {
        user_books(where: {book_id: {_eq: $bookId}}) {
          id
        }
      }
    `;

    const checkResponse = await requestUrl({
        url: 'https://api.hardcover.app/v1/graphql',
        method: 'POST',
        headers: {
            'Authorization': `${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query: checkQuery,
            variables: { bookId: Number(bookId) },
            operationName: 'CheckUserBook'
        })
    });

    let userBookId = null;
    if (checkResponse.status === 200 && checkResponse.json.data?.user_books?.length > 0) {
        userBookId = checkResponse.json.data.user_books[0].id;
    }

    let mutationQuery = '';
    let variables: any = {
        bookId: Number(bookId),
        reviewSlate,
        hasSpoilers
    };

    if (userBookId) {
        // Update existing record
        mutationQuery = `
          mutation UpdateReview($id: Int!, $reviewSlate: jsonb, $hasSpoilers: Boolean) {
            update_user_book(
              id: $id,
              object: {
                review_slate: $reviewSlate,
                review_has_spoilers: $hasSpoilers,
                reviewed_at: "now()"
              }
            ) {
              user_book {
                id
              }
              id
              error
            }
          }
        `;
        variables = { id: userBookId, reviewSlate, hasSpoilers };
    } else {
        // Insert new record
        mutationQuery = `
          mutation InsertReview($bookId: Int!, $reviewSlate: jsonb, $hasSpoilers: Boolean) {
            insert_user_book(
              object: {
                book_id: $bookId,
                review_slate: $reviewSlate,
                review_has_spoilers: $hasSpoilers,
                reviewed_at: "now()"
              }
            ) {
              user_book {
                id
              }
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
    const result = response.json;
    if (result.errors && result.errors.length > 0) {
        throw new Error('GraphQL Error: ' + result.errors[0].message);
    }
    console.log(result);
    return result;
}
