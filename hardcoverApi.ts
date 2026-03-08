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

export async function createReviewPost(
    apiKey: string, 
    bookId: string, 
    content: string, 
    hasSpoilers: boolean, 
    reviewId?: number, 
    rating?: number, 
    privacy: 'public' | 'private' = 'public'
): Promise<any> {
    const parseInlines = (text: string) => {
        const inlines: any[] = [];
        let currentText = "";
        let isBold = false;
        let isItalic = false;
        let isSpoiler = false;
        
        const flushText = () => {
            if (currentText.length > 0) {
                const node: any = { text: currentText, object: "text" };
                if (isBold) node.bold = true;
                if (isItalic) node.italic = true;
                if (isSpoiler) node.spoiler = true;
                inlines.push(node);
                currentText = "";
            }
        };
        
        for (let i = 0; i < text.length; i++) {
            if (text.slice(i).startsWith('<spoiler>')) {
                flushText();
                isSpoiler = true;
                i += 8;
            } else if (text.slice(i).startsWith('</spoiler>')) {
                flushText();
                isSpoiler = false;
                i += 9;
            } else if (text.slice(i).startsWith('**')) {
                flushText();
                isBold = !isBold;
                i += 1;
            } else if (text.slice(i).startsWith('*')) {
                flushText();
                isItalic = !isItalic;
            } else if (text.slice(i).startsWith('_')) {
                flushText();
                isItalic = !isItalic;
            } else {
                currentText += text[i];
            }
        }
        flushText();
        return inlines;
    };

    const documentChildren: any[] = [];
    let currentParagraphChildren: any[] = [];

    const flushParagraph = () => {
        if (currentParagraphChildren.length > 0) {
            documentChildren.push({
                data: {},
                type: "paragraph",
                object: "block",
                children: [...currentParagraphChildren]
            });
            currentParagraphChildren = [];
        }
    };

    const lines = content.split('\n');
    
    lines.forEach((line) => {
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        
        if (headingMatch) {
            flushParagraph();
            const level = headingMatch[1].length;
            const text = headingMatch[2];
            const types = ['heading-one', 'heading-two', 'heading-three', 'heading-four', 'heading-five', 'heading-six'];
            
            documentChildren.push({
                data: {},
                type: types[level - 1],
                object: "block",
                children: parseInlines(text)
            });
        } else if (line.trim() === '' || line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            flushParagraph();
            if (line.trim() !== '') {
                currentParagraphChildren.push(...parseInlines(line));
                flushParagraph();
            }
        } else {
            if (currentParagraphChildren.length > 0) {
                currentParagraphChildren.push({ data: {}, type: "br", object: "inline", children: [] });
            }
            currentParagraphChildren.push(...parseInlines(line));
        }
    });
    flushParagraph();

    const reviewSlate = {
        document: {
            object: "document",
            children: documentChildren
        }
    };

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
    const result = response.json;
    if (result.errors && result.errors.length > 0) {
        throw new Error('GraphQL Error: ' + result.errors[0].message);
    }
    console.debug(result);
    return result;
}
