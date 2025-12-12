import { reverseGeocodeNominatim, searchByPostalCode } from '../lib/geocode';

// Mock fetch
global.fetch = jest.fn();

describe('Geocode Helpers', () => {
    beforeEach(() => {
        (fetch as jest.Mock).mockClear();
    });

    test('reverseGeocodeNominatim returns address on success', async () => {
        const mockResponse = {
            display_name: '123, Main Road, Bangalore',
            address: { road: 'Main Road', city: 'Bangalore' }
        };

        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const result = await reverseGeocodeNominatim(12.97, 77.59);
        expect(result).toEqual(mockResponse);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('reverseGeocodeNominatim throws on error', async () => {
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false
        });
        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: false
        });

        await expect(reverseGeocodeNominatim(0, 0)).rejects.toThrow('Reverse geocode failed'); // It might try fallback which also fails? 
        // Actually our logic tries local API then fallback.
        // We'll trust the mock behavior for now.
    });

    test('searchByPostalCode returns results', async () => {
        const mockResponse = [
            { lat: '12.97', lon: '77.59', display_name: 'Bangalore' }
        ];

        (fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse
        });

        const result = await searchByPostalCode('560001');
        expect(result).toEqual(mockResponse);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=560001'), expect.anything());
    });
});
