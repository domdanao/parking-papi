import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MapScreen } from '../MapScreen';
import { useParkingStore } from '../../store/parkingStore';
import { useAuthStore } from '../../store/authStore';
import * as Location from 'expo-location';

// Mock stores
jest.mock('../../store/parkingStore');
jest.mock('../../store/authStore');

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

// Mock map component
jest.mock('react-native-maps', () => ({
  default: jest.fn(({ children, onPress, onRegionChangeComplete }) => {
    const MockMapView = require('react-native').View;
    return (
      <MockMapView testID="map-view" onPress={onPress}>
        {children}
        <MockMapView
          testID="trigger-region-change"
          onPress={() => onRegionChangeComplete?.({
            latitude: 14.6000,
            longitude: 120.9850,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          })}
        />
      </MockMapView>
    );
  }),
  Marker: jest.fn(({ onPress, children }) => {
    const MockMarker = require('react-native').View;
    return (
      <MockMarker testID="map-marker" onPress={onPress}>
        {children}
      </MockMarker>
    );
  }),
  Callout: jest.fn(({ children }) => {
    const MockCallout = require('react-native').View;
    return (
      <MockCallout testID="map-callout">
        {children}
      </MockCallout>
    );
  }),
}));

describe('MapScreen', () => {
  const mockNearbySlots = [
    {
      id: '1',
      slot_number: 'A001',
      latitude: 14.5995,
      longitude: 120.9842,
      base_hourly_rate: 50.0,
      status: 'available',
      distance_meters: 100,
    },
    {
      id: '2',
      slot_number: 'B002',
      latitude: 14.6005,
      longitude: 120.9852,
      base_hourly_rate: 60.0,
      status: 'occupied',
      distance_meters: 200,
    },
  ];

  const mockParkingStore = {
    nearbySlots: mockNearbySlots,
    currentLocation: {
      latitude: 14.5995,
      longitude: 120.9842,
    },
    isLoading: false,
    error: null,
    searchNearbySlots: jest.fn(),
    clearSlots: jest.fn(),
  };

  const mockAuthStore = {
    user: {
      id: '1',
      role: 'vehicle_owner',
      first_name: 'John',
      last_name: 'Doe',
    },
    isAuthenticated: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useParkingStore as jest.Mock).mockReturnValue(mockParkingStore);
    (useAuthStore as jest.Mock).mockReturnValue(mockAuthStore);

    // Mock location permission as granted
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: {
        latitude: 14.5995,
        longitude: 120.9842,
        accuracy: 10,
      },
      timestamp: Date.now(),
    });
  });

  it('renders map screen correctly', () => {
    const { getByTestId, getByText } = render(<MapScreen />);

    expect(getByTestId('map-view')).toBeTruthy();
    expect(getByText('Find Parking')).toBeTruthy();
    expect(getByTestId('location-button')).toBeTruthy();
  });

  it('displays parking slot markers on map', () => {
    const { getAllByTestId } = render(<MapScreen />);

    const markers = getAllByTestId('map-marker');
    expect(markers).toHaveLength(2); // Two nearby slots
  });

  it('requests location permission and gets current position', async () => {
    render(<MapScreen />);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(Location.getCurrentPositionAsync).toHaveBeenCalled();
    });
  });

  it('handles location permission denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const { getByText } = render(<MapScreen />);

    await waitFor(() => {
      expect(getByText('Location access denied')).toBeTruthy();
    });
  });

  it('searches for nearby slots when location changes', async () => {
    const { getByTestId } = render(<MapScreen />);

    const triggerRegionChange = getByTestId('trigger-region-change');
    fireEvent.press(triggerRegionChange);

    await waitFor(() => {
      expect(mockParkingStore.searchNearbySlots).toHaveBeenCalledWith({
        latitude: 14.6000,
        longitude: 120.9850,
        radius: 1000,
      });
    });
  });

  it('shows slot details when marker is pressed', async () => {
    const { getAllByTestId, getByText } = render(<MapScreen />);

    const markers = getAllByTestId('map-marker');
    fireEvent.press(markers[0]);

    await waitFor(() => {
      expect(getByText('A001')).toBeTruthy();
      expect(getByText('₱50/hour')).toBeTruthy();
      expect(getByText('Available')).toBeTruthy();
    });
  });

  it('navigates to slot details when callout is pressed', async () => {
    const mockNavigate = jest.fn();

    // Mock navigation
    jest.mock('@react-navigation/native', () => ({
      ...jest.requireActual('@react-navigation/native'),
      useNavigation: () => ({ navigate: mockNavigate }),
    }));

    const { getAllByTestId, getByTestId } = render(<MapScreen />);

    const markers = getAllByTestId('map-marker');
    fireEvent.press(markers[0]);

    await waitFor(() => {
      const callout = getByTestId('map-callout');
      fireEvent.press(callout);
    });

    expect(mockNavigate).toHaveBeenCalledWith('SlotDetails', {
      slotId: '1',
    });
  });

  it('handles location button press', async () => {
    const { getByTestId } = render(<MapScreen />);

    const locationButton = getByTestId('location-button');
    fireEvent.press(locationButton);

    await waitFor(() => {
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(2); // Once on mount, once on button press
    });
  });

  it('displays different markers for different slot statuses', () => {
    const { getAllByTestId } = render(<MapScreen />);

    const markers = getAllByTestId('map-marker');

    // First marker should be available (green)
    expect(markers[0]).toHaveStyle({ backgroundColor: 'green' });

    // Second marker should be occupied (red)
    expect(markers[1]).toHaveStyle({ backgroundColor: 'red' });
  });

  it('shows loading state while fetching slots', () => {
    const loadingParkingStore = {
      ...mockParkingStore,
      isLoading: true,
    };

    (useParkingStore as jest.Mock).mockReturnValue(loadingParkingStore);

    const { getByTestId } = render(<MapScreen />);

    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('displays error message when slot loading fails', () => {
    const errorParkingStore = {
      ...mockParkingStore,
      error: 'Failed to load parking slots',
    };

    (useParkingStore as jest.Mock).mockReturnValue(errorParkingStore);

    const { getByText } = render(<MapScreen />);

    expect(getByText('Failed to load parking slots')).toBeTruthy();
  });

  it('filters slots by availability', async () => {
    const { getByTestId } = render(<MapScreen />);

    const filterButton = getByTestId('filter-button');
    fireEvent.press(filterButton);

    const availableFilter = getByTestId('available-filter');
    fireEvent.press(availableFilter);

    await waitFor(() => {
      // Should only show available slots
      const markers = getAllByTestId('map-marker');
      expect(markers).toHaveLength(1);
    });
  });

  it('shows user location marker', () => {
    const { getByTestId } = render(<MapScreen />);

    expect(getByTestId('user-location-marker')).toBeTruthy();
  });

  it('handles map zoom controls', () => {
    const { getByTestId } = render(<MapScreen />);

    const zoomInButton = getByTestId('zoom-in-button');
    const zoomOutButton = getByTestId('zoom-out-button');

    fireEvent.press(zoomInButton);
    fireEvent.press(zoomOutButton);

    // Should trigger map region updates
  });

  it('refreshes slots when pull-to-refresh is triggered', async () => {
    const { getByTestId } = render(<MapScreen />);

    const scrollView = getByTestId('map-scroll-view');
    fireEvent(scrollView, 'onRefresh');

    await waitFor(() => {
      expect(mockParkingStore.searchNearbySlots).toHaveBeenCalled();
    });
  });

  it('navigates to QR scanner when scan button is pressed', () => {
    const mockNavigate = jest.fn();

    jest.mock('@react-navigation/native', () => ({
      ...jest.requireActual('@react-navigation/native'),
      useNavigation: () => ({ navigate: mockNavigate }),
    }));

    const { getByTestId } = render(<MapScreen />);

    const scanButton = getByTestId('scan-qr-button');
    fireEvent.press(scanButton);

    expect(mockNavigate).toHaveBeenCalledWith('QRScanner');
  });

  it('handles network connectivity changes', async () => {
    // Mock network state change
    const { rerender } = render(<MapScreen />);

    // Simulate going offline
    const offlineParkingStore = {
      ...mockParkingStore,
      error: 'Network error',
    };

    (useParkingStore as jest.Mock).mockReturnValue(offlineParkingStore);

    rerender(<MapScreen />);

    await waitFor(() => {
      expect(getByText('Network error')).toBeTruthy();
    });
  });

  it('persists map region between renders', () => {
    const { rerender } = render(<MapScreen />);

    // Trigger region change
    const { getByTestId } = render(<MapScreen />);
    const triggerRegionChange = getByTestId('trigger-region-change');
    fireEvent.press(triggerRegionChange);

    rerender(<MapScreen />);

    // Map should maintain the same region
  });
});