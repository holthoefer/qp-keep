
import type { StorageFile } from "@/types";

export const findThumbnailUrl = (originalUrl?: string | null, allFiles?: StorageFile[]): string => {
    // Return a placeholder if no original URL is provided.
    if (!originalUrl) {
        return 'https://placehold.co/200x200.png?text=No+Image';
    }

    // If we don't have a list of files to search through, we can't find a thumbnail.
    // Return the original URL as a fallback, which might be large.
    if (!allFiles || allFiles.length === 0) {
        return originalUrl;
    }

    try {
        // Find the file object in the list that corresponds to the original URL.
        const originalFile = allFiles.find(file => file.url === originalUrl);
        
        // If we found the file and it has a thumbnail URL, return it.
        // Otherwise, fall back to a placeholder to avoid loading the large image.
        return originalFile?.thumbnailUrl || 'https://placehold.co/200x200.png?text=No+Thumb';
    } catch (e) {
        console.error("Error finding thumbnail URL:", e);
        // In case of any error, always fall back to a placeholder.
        return 'https://placehold.co/200x200.png?text=Error';
    }
};
