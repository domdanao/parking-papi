import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { SlotSearch } from '../VehicleOwner/SlotSearch';
import { mockFetch, mockGeolocation, createMockParkingSlot } from '@/test-utils';

// Mock geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
});

describe('SlotSearch Component', () => {
  const mockSlots = [
    createMockParkingSlot({
      id: '1',
      slot_number: 'A001',
      base_hourly_rate: 50.0,
      distance_meters: 100,
    }),
    createMockParkingSlot({
      id: '2',
      slot_number: 'B002',
      base_hourly_rate: 75.0,
      distance_meters: 200,
    }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search interface correctly', () => {
    render(<SlotSearch />);

    expect(screen.getByPlaceholderText('Enter location or address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use current location/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search slots/i })).toBeInTheDocument();
  });

  it('handles current location request', async () => {
    mockFetch.success({
      slots: mockSlots,
      total: 2,
      current_location: { latitude: 14.5995, longitude: 120.9842 },
      search_radius_meters: 1000,
    });

    render(<SlotSearch />);

    const useLocationButton = screen.getByRole('button', { name: /use current location/i });
    fireEvent.click(useLocationButton);

    await waitFor(() => {
      expect(screen.getByText('Getting your location...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('A001')).toBeInTheDocument();
      expect(screen.getByText('B002')).toBeInTheDocument();
    });
  });

  it('handles location permission denied', async () => {
    const mockError = jest.fn();
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: (success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1, message: 'Permission denied' } as GeolocationPositionError);
        },
      },
    });

    render(<SlotSearch onError={mockError} />);

    const useLocationButton = screen.getByRole('button', { name: /use current location/i });
    fireEvent.click(useLocationButton);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith('Location access denied. Please enable location services.');
    });
  });

  it('searches by address input', async () => {
    mockFetch.success({
      slots: mockSlots,
      total: 2,
      search_location: { latitude: 14.6000, longitude: 120.9850 },
      search_radius_meters: 1000,
    });

    render(<SlotSearch />);

    const addressInput = screen.getByPlaceholderText('Enter location or address');
    fireEvent.change(addressInput, {
      target: { value: 'Makati City, Metro Manila' },
    });

    const searchButton = screen.getByRole('button', { name: /search slots/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('A001')).toBeInTheDocument();
      expect(screen.getByText('B002')).toBeInTheDocument();
    });
  });

  it('displays filters and applies them correctly', async () => {
    render(<SlotSearch />);

    // Open filters
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filtersButton);

    expect(screen.getByText('Search Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Price (₱/hour)')).toBeInTheDocument();
    expect(screen.getByLabelText('Search Radius (meters)')).toBeInTheDocument();

    // Set max price filter
    const maxPriceInput = screen.getByLabelText('Max Price (₱/hour)');
    fireEvent.change(maxPriceInput, { target: { value: '60' } });

    // Set radius filter
    const radiusSlider = screen.getByLabelText('Search Radius (meters)');
    fireEvent.change(radiusSlider, { target: { value: '500' } });

    // Apply filters
    const applyFiltersButton = screen.getByRole('button', { name: /apply filters/i });
    fireEvent.click(applyFiltersButton);

    // Mock filtered results
    mockFetch.success({
      slots: [mockSlots[0]], // Only the 50₱/hour slot
      total: 1,
      applied_filters: {
        max_price: 60,
        radius: 500,
      },
    });

    const searchButton = screen.getByRole('button', { name: /search slots/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('A001')).toBeInTheDocument();
      expect(screen.queryByText('B002')).not.toBeInTheDocument();
    });
  });

  it('filters by amenities', async () => {
    render(<SlotSearch />);

    const filtersButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filtersButton);

    // Select amenities
    const coveredCheckbox = screen.getByLabelText('Covered');
    const securedCheckbox = screen.getByLabelText('Secured');
    const evChargingCheckbox = screen.getByLabelText('EV Charging');

    fireEvent.click(coveredCheckbox);
    fireEvent.click(evChargingCheckbox);

    expect(coveredCheckbox).toBeChecked();
    expect(evChargingCheckbox).toBeChecked();
    expect(securedCheckbox).not.toBeChecked();

    const applyFiltersButton = screen.getByRole('button', { name: /apply filters/i });
    fireEvent.click(applyFiltersButton);

    // Verify filter state is maintained
    expect(screen.getByText('Covered, EV Charging')).toBeInTheDocument();
  });

  it('displays slot results with correct information', async () => {
    mockFetch.success({
      slots: mockSlots,
      total: 2,
    });

    render(<SlotSearch />);

    const searchButton = screen.getByRole('button', { name: /search slots/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      // Check slot A001
      expect(screen.getByText('A001')).toBeInTheDocument();
      expect(screen.getByText('₱50/hour')).toBeInTheDocument();
      expect(screen.getByText('100m away')).toBeInTheDocument();
      expect(screen.getByText('2 min walk')).toBeInTheDocument();

      // Check slot B002
      expect(screen.getByText('B002')).toBeInTheDocument();
      expect(screen.getByText('₱75/hour')).toBeInTheDocument();
      expect(screen.getByText('200m away')).toBeInTheDocument();
    });
  });

  it('handles sorting options', async () => {
    mockFetch.success({
      slots: mockSlots,
      total: 2,
    });

    render(<SlotSearch />);

    // Trigger initial search
    const searchButton = screen.getByRole('button', { name: /search slots/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Sort by')).toBeInTheDocument();
    });

    // Change sorting
    const sortSelect = screen.getByDisplayValue('Distance');
    fireEvent.change(sortSelect, { target: { value: 'price_low' } });

    // Mock sorted results
    const sortedSlots = [...mockSlots].sort((a, b) => a.base_hourly_rate - b.base_hourly_rate);
    mockFetch.success({
      slots: sortedSlots,
      total: 2,
    });

    await waitFor(() => {
      const slotCards = screen.getAllByTestId('parking-slot-card');
      expect(slotCards[0]).toHaveTextContent('A001'); // ₱50/hour slot first
      expect(slotCards[1]).toHaveTextContent('B002'); // ₱75/hour slot second
    });
  });

  it('displays no results message when no slots found', async () => {
    mockFetch.success({
      slots: [],
      total: 0,
    });

    render(<SlotSearch />);

    const searchButton = screen.getByRole('button', { name: /search slots/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('No parking slots found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search location or filters')).toBeInTheDocument();
    });
  });

  it('handles search errors gracefully', async () => {
    const mockError = jest.fn();
    mockFetch.error(500, 'Search service unavailable');

    render(<SlotSearch onError={mockError} />);

    const searchButton = screen.getByRole('button', { name: /search slots/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith('Search service unavailable');
    });
  });

  it('shows loading state during search', async () => {
    render(<SlotSearch />);

    const searchButton = screen.getByRole('button', { name: /search slots/i });
    fireEvent.click(searchButton);

    expect(screen.getByText('Searching for parking slots...')).toBeInTheDocument();
    expect(searchButton).toBeDisabled();
  });

  it('handles slot selection and navigation', async () => {
    const mockOnSlotSelect = jest.fn();
    mockFetch.success({
      slots: mockSlots,
      total: 2,
    });

    render(<SlotSearch onSlotSelect={mockOnSlotSelect} />);

    const searchButton = screen.getByRole('button', { name: /search slots/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByRole('button', { name: /view details/i });
      fireEvent.click(viewDetailsButtons[0]);
    });

    expect(mockOnSlotSelect).toHaveBeenCalledWith(mockSlots[0]);
  });

  it('validates address input before search', async () => {
    render(<SlotSearch />);

    const searchButton = screen.getByRole('button', { name: /search slots/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a location or use current location')).toBeInTheDocument();
    });
  });

  it('clears filters correctly', async () => {
    render(<SlotSearch />);

    const filtersButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filtersButton);

    // Set some filters
    const maxPriceInput = screen.getByLabelText('Max Price (₱/hour)');
    fireEvent.change(maxPriceInput, { target: { value: '60' } });

    const coveredCheckbox = screen.getByLabelText('Covered');
    fireEvent.click(coveredCheckbox);

    // Clear filters
    const clearFiltersButton = screen.getByRole('button', { name: /clear filters/i });
    fireEvent.click(clearFiltersButton);

    expect(maxPriceInput).toHaveValue('');
    expect(coveredCheckbox).not.toBeChecked();
  });

  it('persists search state between component renders', async () => {
    mockFetch.success({
      slots: mockSlots,
      total: 2,
    });

    const { rerender } = render(<SlotSearch />);

    const addressInput = screen.getByPlaceholderText('Enter location or address');
    fireEvent.change(addressInput, {
      target: { value: 'Makati City' },
    });

    const searchButton = screen.getByRole('button', { name: /search slots/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('A001')).toBeInTheDocument();
    });

    // Rerender component
    rerender(<SlotSearch />);

    // Search state should be preserved
    expect(screen.getByText('A001')).toBeInTheDocument();
    expect(addressInput).toHaveValue('Makati City');
  });
});