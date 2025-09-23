import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { QRScanner } from '../Common/QRScanner';

// Mock the QR scanner library
jest.mock('qr-scanner', () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
    setCamera: jest.fn(),
    hasFlash: jest.fn().mockReturnValue(true),
    toggleFlash: jest.fn(),
  }));
});

// Mock getUserMedia
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

describe('QRScanner Component', () => {
  const mockOnScan = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    });
  });

  it('renders scanner interface correctly', () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={false}
      />
    );

    expect(screen.getByTestId('qr-scanner-container')).toBeInTheDocument();
    expect(screen.getByText('Position QR code within the frame')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start scanning/i })).toBeInTheDocument();
  });

  it('starts scanning when start button is clicked', async () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={false}
      />
    );

    const startButton = screen.getByRole('button', { name: /start scanning/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByText('Scanning...')).toBeInTheDocument();
    });

    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'environment' },
    });
  });

  it('stops scanning when stop button is clicked', async () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={true}
      />
    );

    const stopButton = screen.getByRole('button', { name: /stop scanning/i });
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(screen.getByText('Position QR code within the frame')).toBeInTheDocument();
    });
  });

  it('handles camera permission denied', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={false}
      />
    );

    const startButton = screen.getByRole('button', { name: /start scanning/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        'Camera access denied. Please enable camera permissions.'
      );
    });
  });

  it('toggles flashlight when available', async () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={true}
        showFlashToggle={true}
      />
    );

    const flashButton = screen.getByRole('button', { name: /toggle flash/i });
    expect(flashButton).toBeInTheDocument();

    fireEvent.click(flashButton);

    await waitFor(() => {
      expect(screen.getByTestId('flash-on-icon')).toBeInTheDocument();
    });
  });

  it('calls onScan when QR code is detected', async () => {
    const QRScannerMock = require('qr-scanner');
    const scannerInstance = new QRScannerMock();

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={true}
      />
    );

    // Simulate QR code detection
    const mockQRData = 'parking://slot/123e4567-e89b-12d3-a456-426614174000';

    // Access the onDecode callback that was passed to QRScanner constructor
    const onDecodeCallback = QRScannerMock.mock.calls[0][1];
    onDecodeCallback({ data: mockQRData });

    expect(mockOnScan).toHaveBeenCalledWith(mockQRData);
  });

  it('displays error when QR scanning fails', async () => {
    const QRScannerMock = require('qr-scanner');

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={true}
      />
    );

    // Simulate scanning error
    const onErrorCallback = QRScannerMock.mock.calls[0][2];
    onErrorCallback(new Error('Scanning failed'));

    expect(mockOnError).toHaveBeenCalledWith('Failed to scan QR code. Please try again.');
  });

  it('switches between front and back camera', async () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={true}
        showCameraSwitch={true}
      />
    );

    const cameraSwitchButton = screen.getByRole('button', { name: /switch camera/i });
    fireEvent.click(cameraSwitchButton);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'user' },
      });
    });
  });

  it('cleans up resources when unmounted', () => {
    const QRScannerMock = require('qr-scanner');
    const scannerInstance = new QRScannerMock();

    const { unmount } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={true}
      />
    );

    unmount();

    expect(scannerInstance.destroy).toHaveBeenCalled();
  });

  it('handles different QR code formats', async () => {
    const QRScannerMock = require('qr-scanner');

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={true}
      />
    );

    const onDecodeCallback = QRScannerMock.mock.calls[0][1];

    // Test different formats
    const formats = [
      'parking://slot/123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174000',
      '{"slot_id":"123e4567-e89b-12d3-a456-426614174000"}',
    ];

    formats.forEach(format => {
      onDecodeCallback({ data: format });
      expect(mockOnScan).toHaveBeenCalledWith(format);
    });
  });

  it('shows scanning overlay when active', () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={true}
      />
    );

    expect(screen.getByTestId('scanning-overlay')).toBeInTheDocument();
    expect(screen.getByText('Scanning for QR code...')).toBeInTheDocument();
  });

  it('displays proper instructions based on state', () => {
    const { rerender } = render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={false}
      />
    );

    expect(screen.getByText('Position QR code within the frame')).toBeInTheDocument();

    rerender(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={true}
      />
    );

    expect(screen.getByText('Scanning for QR code...')).toBeInTheDocument();
  });

  it('respects disabled state', () => {
    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={false}
        disabled={true}
      />
    );

    const startButton = screen.getByRole('button', { name: /start scanning/i });
    expect(startButton).toBeDisabled();
  });

  it('handles rapid QR code detections correctly', async () => {
    const QRScannerMock = require('qr-scanner');

    render(
      <QRScanner
        onScan={mockOnScan}
        onError={mockOnError}
        isActive={true}
        scanDelay={1000} // 1 second delay between scans
      />
    );

    const onDecodeCallback = QRScannerMock.mock.calls[0][1];
    const mockQRData = 'parking://slot/123e4567-e89b-12d3-a456-426614174000';

    // Rapid fire QR detections
    onDecodeCallback({ data: mockQRData });
    onDecodeCallback({ data: mockQRData });
    onDecodeCallback({ data: mockQRData });

    // Should only call onScan once due to debouncing
    expect(mockOnScan).toHaveBeenCalledTimes(1);
  });
});