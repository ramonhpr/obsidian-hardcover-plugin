export function parseMarkdownToSlate(content: string) {
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

    return {
        document: {
            object: "document",
            children: documentChildren
        }
    };
}
