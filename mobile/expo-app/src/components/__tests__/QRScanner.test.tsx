import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QRScanner } from '../QRScanner';
import * as Camera from 'expo-camera';

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: jest.fn(({ onBarcodeScanned, children }) => {
    // Mock component that can trigger barcode scan
    const MockCamera = require('react-native').View;
    return (
      <MockCamera testID="camera-view">
        {children}
        <MockCamera
          testID="trigger-scan"
          onPress={() =>
            onBarcodeScanned?.({
              type: 'qr',
              data: 'parking://slot/123e4567-e89b-12d3-a456-426614174000',
            })
          }
        />
      </MockCamera>
    );
  }),
  useCameraPermissions: jest.fn(),
  BarCodeScanner: {
    Constants: {
      BarCodeType: {
        qr: 'qr',
      },
    },
  },
}));

describe('QRScanner Component', () => {
  const mockOnScan = jest.fn();
  const mockOnError = jest.fn();
  const mockOnPermissionDenied = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock camera permissions as granted by default
    (Camera.useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: true },
      jest.fn(() => Promise.resolve({ granted: true })),
    ]);
  });

  it('renders scanner interface correctly', () => {
    const { getByTestId, getByText } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
      />
    );

    expect(getByTestId('qr-scanner-container')).toBeTruthy();
    expect(getByText('Position QR code within the frame')).toBeTruthy();
    expect(getByTestId('camera-view')).toBeTruthy();
  });

  it('requests camera permissions when not granted', async () => {
    const mockRequestPermission = jest.fn(() =>
      Promise.resolve({ granted: true })
    );

    (Camera.useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: false },
      mockRequestPermission,
    ]);

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
      />
    );

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  it('calls onPermissionDenied when camera permission is denied', async () => {
    const mockRequestPermission = jest.fn(() =>
      Promise.resolve({ granted: false })
    );

    (Camera.useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: false },
      mockRequestPermission,
    ]);

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
      />
    );

    await waitFor(() => {
      expect(mockOnPermissionDenied).toHaveBeenCalled();
    });
  });

  it('handles QR code scanning successfully', async () => {
    const { getByTestId } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
      />
    );

    const triggerScan = getByTestId('trigger-scan');
    fireEvent.press(triggerScan);

    await waitFor(() => {
      expect(mockOnScan).toHaveBeenCalledWith(
        'parking://slot/123e4567-e89b-12d3-a456-426614174000'
      );
    });
  });

  it('shows inactive state when not active', () => {
    const { getByText, queryByTestId } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={false}
      />
    );

    expect(getByText('Camera is inactive')).toBeTruthy();
    expect(queryByTestId('camera-view')).toBeFalsy();
  });

  it('displays scanning overlay when active', () => {
    const { getByTestId } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
      />
    );

    expect(getByTestId('scanning-overlay')).toBeTruthy();
    expect(getByTestId('scanning-frame')).toBeTruthy();
  });

  it('handles torch toggle', () => {
    const { getByTestId } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
        showTorchButton={true}
      />
    );

    const torchButton = getByTestId('torch-button');
    expect(torchButton).toBeTruthy();

    fireEvent.press(torchButton);
    // Should toggle torch state
  });

  it('prevents rapid scanning with debounce', async () => {
    const { getByTestId } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
        scanDelay={1000}
      />
    );

    const triggerScan = getByTestId('trigger-scan');

    // Rapid fire scans
    fireEvent.press(triggerScan);
    fireEvent.press(triggerScan);
    fireEvent.press(triggerScan);

    await waitFor(() => {
      expect(mockOnScan).toHaveBeenCalledTimes(1);
    });
  });

  it('handles different QR code formats', async () => {
    const formats = [
      'parking://slot/123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174000',
      '{"slot_id":"123e4567-e89b-12d3-a456-426614174000"}',
    ];

    const { getByTestId, rerender } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
      />
    );

    for (const format of formats) {
      // Mock different QR data
      (Camera.CameraView as jest.Mock).mockImplementation(
        ({ onBarcodeScanned, children }) => {
          const MockCamera = require('react-native').View;
          return (
            <MockCamera testID="camera-view">
              {children}
              <MockCamera
                testID="trigger-scan"
                onPress={() =>
                  onBarcodeScanned?.({
                    type: 'qr',
                    data: format,
                  })
                }
              />
            </MockCamera>
          );
        }
      );

      rerender(
        <QRScanner
          onScan={mockOnScan}
          onError={mockOnError}
          onPermissionDenied={mockOnPermissionDenied}
          isActive={true}
        />
      );

      const triggerScan = getByTestId('trigger-scan');
      fireEvent.press(triggerScan);
    }

    await waitFor(() => {
      expect(mockOnScan).toHaveBeenCalledWith(formats[0]);
      expect(mockOnScan).toHaveBeenCalledWith(formats[1]);
      expect(mockOnScan).toHaveBeenCalledWith(formats[2]);
    });
  });

  it('shows error state when scanning fails', async () => {
    // Mock camera to throw error
    (Camera.CameraView as jest.Mock).mockImplementation(() => {
      throw new Error('Camera error');
    });

    const { getByText } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
      />
    );

    await waitFor(() => {
      expect(getByText('Camera error occurred')).toBeTruthy();
    });
  });

  it('handles camera focus events', async () => {
    const { getByTestId } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
        autoFocus={true}
      />
    );

    const cameraView = getByTestId('camera-view');

    // Simulate camera focus
    fireEvent(cameraView, 'onCameraReady');

    // Should initialize auto-focus
  });

  it('respects zoom control', () => {
    const { getByTestId } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
        showZoomControls={true}
        zoom={0.5}
      />
    );

    expect(getByTestId('zoom-controls')).toBeTruthy();
  });

  it('handles scan result validation', async () => {
    const mockOnValidate = jest.fn(() => false); // Invalid QR

    const { getByTestId } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        onValidateQR={mockOnValidate}
        isActive={true}
      />
    );

    const triggerScan = getByTestId('trigger-scan');
    fireEvent.press(triggerScan);

    await waitFor(() => {
      expect(mockOnValidate).toHaveBeenCalled();
      expect(mockOnScan).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalledWith('Invalid QR code format');
    });
  });

  it('cleans up resources on unmount', () => {
    const { unmount } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        onPermissionDenied={mockOnPermissionDenied}
        isActive={true}
      />
    );

    unmount();

    // Should clean up timers and event listeners
  });
});