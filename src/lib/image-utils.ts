
import type { StorageFile } from "@/types";

export const findThumbnailUrl = (originalUrl?: string | null, allFiles?: StorageFile[]): string => {
    if (!originalUrl) return '/placeholder.svg';

    // If the original URL is already a thumbnail, return it
    if (originalUrl.includes('_200x200.')) {
        return originalUrl;
    }

    // If allFiles is not provided, construct the expected thumbnail URL
    if (!allFiles || allFiles.length === 0) {
        const urlParts = originalUrl.split('?');
        const path = decodeURIComponent(urlParts[0]);
        const extensionIndex = path.lastIndexOf('.');
        if (extensionIndex === -1) return originalUrl;
        const pathWithoutExtension = path.substring(0, extensionIndex);
        const extension = path.substring(extensionIndex);
        return `${pathWithoutExtension}_200x200${extension}?${urlParts[1]}`;
    }

    // Otherwise, find the thumbnail in the provided list
    const foundFile = allFiles.find(file => file.url === originalUrl);
    return foundFile?.thumbnailUrl || originalUrl;
};
