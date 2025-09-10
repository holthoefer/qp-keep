
export const generateThumbnailUrl = (originalUrl?: string | null): string => {
    if (!originalUrl) {
        return 'https://placehold.co/200x200.png?text=No+Image';
    }
    
    // Check for common image extensions
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(originalUrl.split('?')[0]);
    if (!isImage) {
        // Return a placeholder or a generic icon URL for non-image files
        return ''; // Let the component decide how to render this
    }

    try {
        // Firebase Storage adds _200x200 before the file extension.
        // We need to handle URLs with and without query parameters.
        const url = new URL(originalUrl);
        const pathParts = url.pathname.split('/');
        const fileName = pathParts.pop() || '';
        
        // Find the last dot to insert the suffix before the extension
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1) {
            // No extension found, just append
            return `${originalUrl}_200x200`;
        }

        const name = fileName.substring(0, lastDotIndex);
        const extension = fileName.substring(lastDotIndex); // .jpg, .png, etc.

        // Reconstruct the URL with the thumbnail suffix in the pathname
        const newPathname = [...pathParts, `${name}_200x200${extension}`].join('/');
        
        // Preserve the original search parameters (like Firebase tokens)
        url.pathname = newPathname;
        return url.toString();

    } catch (e) {
        console.error("Error generating thumbnail URL:", e);
        return 'https://placehold.co/200x200.png?text=Invalid+URL';
    }
}
