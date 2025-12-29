/**
 * Utility to read a Blob as a Data URL (base64 string).
 * @param blob The Blob to read.
 * @returns Promise resolving to the Data URL or null.
 */
export function readBlobAsDataURL(blob: Blob): Promise<string | ArrayBuffer | null> {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = (e) => resolve(e.target?.result ?? null);
		reader.readAsDataURL(blob);
	});
}
