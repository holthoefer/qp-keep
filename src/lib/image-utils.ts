

import type { StorageFile } from "@/types";

export const findThumbnailUrl = (originalUrl?: string | null, allFiles?: StorageFile[]): string => {
    // This function is kept for legacy support (e.g. printing) but is no longer
    // the primary method for displaying thumbnails in the UI to avoid slow queries.
    if (!originalUrl) {
        return 'https://placehold.co/200x200.png?text=No+Image';
    }

    if (!allFiles || allFiles.length === 0) {
        return generateThumbnailUrl(originalUrl);
    }

    try {
        const originalFile = allFiles.find(file => file.url === originalUrl);
        if (originalFile && originalFile.thumbnailUrl) {
            return originalFile.thumbnailUrl;
        }
        return generateThumbnailUrl(originalUrl);
    } catch (e) {
        console.error("Error finding thumbnail URL:", e);
        return 'https://placehold.co/200x200.png?text=Error';
    }
};

export const generateThumbnailUrl = (originalUrl?: string | null): string => {
    if (!originalUrl) {
        return 'https://placehold.co/200x200.png?text=No+Image';
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
