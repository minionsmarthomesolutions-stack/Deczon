import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LocationSelector from '../components/LocationSelector';
import * as geolocation from '../lib/geolocation';
import * as geocode from '../lib/geocode';

// Mock helpers
jest.mock('../lib/geolocation');
jest.mock('../lib/geocode');

describe('LocationSelector Component', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    test('renders trigger button correctly', () => {
        render(<LocationSelector />);
        expect(screen.getByText('Delivering to')).toBeInTheDocument();
        expect(screen.getByText('Select Location')).toBeInTheDocument();
    });

    test('opens modal on click', () => {
        render(<LocationSelector />);
        const button = screen.getByLabelText('Change Location');
        fireEvent.click(button);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Detect my location')).toBeInTheDocument();
    });

    test('handles detection success', async () => {
        (geolocation.getBrowserLocation).mockResolvedValue({ lat: 12.97, lon: 77.59 });
        (geocode.reverseGeocodeNominatim).mockResolvedValue({
            display_name: 'Bangalore, India',
            address: { city: 'Bangalore', state: 'Karnataka', postcode: '560001' }
        });

        render(<LocationSelector />);

        // Open modal
        fireEvent.click(screen.getByLabelText('Change Location'));

        // Click detect
        fireEvent.click(screen.getByText('Detect my location'));

        expect(screen.getByText('Detecting...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        expect(screen.getByText('560001')).toBeInTheDocument();
        expect(localStorage.getItem('user_location_v1')).toContain('Bangalore');
    });

    test('handles manual search', async () => {
        (geocode.searchByPostalCode).mockResolvedValue([
            {
                lat: '12.97',
                lon: '77.59',
                display_name: 'Bangalore Urban',
                address: { city: 'Bangalore', postcode: '560001' }
            }
        ]);

        render(<LocationSelector />);
        fireEvent.click(screen.getByLabelText('Change Location'));

        const input = screen.getByPlaceholderText('Enter Pincode or City');
        fireEvent.change(input, { target: { value: 'Bangalore' } });
        fireEvent.click(screen.getByText('Check'));

        await waitFor(() => {
            expect(screen.getByText('Bangalore Urban')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Bangalore Urban'));

        await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        expect(screen.getByText('560001')).toBeInTheDocument();
    });
});
