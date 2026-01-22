/**
 * Helper to get browser location using the navigator.geolocation API.
 * 
 * @param {Object} options - Geolocation options
 * @param {number} options.timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<{lat: number, lon: number}>} - Resolves with latitude and longitude
 */
export function getBrowserLocation({ timeout = 10000 }: { timeout?: number } = {}): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            return reject(new Error('Geolocation not supported'));
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            (err) => reject(err),
            { enableHighAccuracy: false, timeout, maximumAge: 0 }
        );
    });
}
