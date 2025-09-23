import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { SlotManagement } from '../SlotOwner/SlotManagement';
import { mockFetch, createMockParkingSlot } from '@/test-utils';

// Mock Inertia router
const mockVisit = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.mock('@inertiajs/react', () => ({
  ...jest.requireActual('@inertiajs/react'),
  router: {
    visit: mockVisit,
    post: mockPost,
    put: mockPut,
    delete: mockDelete,
  },
}));

describe('SlotManagement Component', () => {
  const mockSlots = [
    createMockParkingSlot({
      id: '1',
      slot_number: 'A001',
      status: 'available',
      approval_status: 'published',
      base_hourly_rate: 50.0,
    }),
    createMockParkingSlot({
      id: '2',
      slot_number: 'A002',
      status: 'occupied',
      approval_status: 'published',
      base_hourly_rate: 60.0,
    }),
    createMockParkingSlot({
      id: '3',
      slot_number: 'A003',
      status: 'maintenance',
      approval_status: 'under_review',
      base_hourly_rate: 45.0,
    }),
  ];

  const mockProps = {
    slots: mockSlots,
    pagination: {
      current_page: 1,
      total: 3,
      per_page: 10,
      last_page: 1,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders slot management interface correctly', () => {
    render(<SlotManagement {...mockProps} />);

    expect(screen.getByText('Parking Slot Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add new slot/i })).toBeInTheDocument();
    expect(screen.getByText('A001')).toBeInTheDocument();
    expect(screen.getByText('A002')).toBeInTheDocument();
    expect(screen.getByText('A003')).toBeInTheDocument();
  });

  it('displays slot cards with correct status indicators', () => {
    render(<SlotManagement {...mockProps} />);

    // Available slot
    const availableSlot = screen.getByTestId('slot-card-1');
    expect(availableSlot).toHaveTextContent('Available');
    expect(availableSlot).toHaveClass('border-green-200');

    // Occupied slot
    const occupiedSlot = screen.getByTestId('slot-card-2');
    expect(occupiedSlot).toHaveTextContent('Occupied');
    expect(occupiedSlot).toHaveClass('border-red-200');

    // Maintenance slot
    const maintenanceSlot = screen.getByTestId('slot-card-3');
    expect(maintenanceSlot).toHaveTextContent('Maintenance');
    expect(maintenanceSlot).toHaveClass('border-yellow-200');
  });

  it('filters slots by status', async () => {
    render(<SlotManagement {...mockProps} />);

    const statusFilter = screen.getByDisplayValue('All Statuses');
    fireEvent.change(statusFilter, { target: { value: 'available' } });

    await waitFor(() => {
      expect(mockVisit).toHaveBeenCalledWith(
        expect.stringContaining('status=available'),
        expect.any(Object)
      );
    });
  });

  it('filters slots by approval status', async () => {
    render(<SlotManagement {...mockProps} />);

    const approvalFilter = screen.getByDisplayValue('All Approval Status');
    fireEvent.change(approvalFilter, { target: { value: 'published' } });

    await waitFor(() => {
      expect(mockVisit).toHaveBeenCalledWith(
        expect.stringContaining('approval_status=published'),
        expect.any(Object)
      );
    });
  });

  it('searches slots by slot number or address', async () => {
    render(<SlotManagement {...mockProps} />);

    const searchInput = screen.getByPlaceholderText('Search slots...');
    fireEvent.change(searchInput, { target: { value: 'A001' } });

    // Simulate search debounce
    await waitFor(() => {
      expect(mockVisit).toHaveBeenCalledWith(
        expect.stringContaining('search=A001'),
        expect.any(Object)
      );
    }, { timeout: 1000 });
  });

  it('opens add slot modal', () => {
    render(<SlotManagement {...mockProps} />);

    const addButton = screen.getByRole('button', { name: /add new slot/i });
    fireEvent.click(addButton);

    expect(screen.getByText('Add New Parking Slot')).toBeInTheDocument();
    expect(screen.getByLabelText('Slot Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Hourly Rate (₱)')).toBeInTheDocument();
  });

  it('creates new slot successfully', async () => {
    mockFetch.success({
      id: '4',
      slot_number: 'A004',
      status: 'available',
      approval_status: 'draft',
    });

    render(<SlotManagement {...mockProps} />);

    const addButton = screen.getByRole('button', { name: /add new slot/i });
    fireEvent.click(addButton);

    // Fill form
    fireEvent.change(screen.getByLabelText('Slot Number'), {
      target: { value: 'A004' },
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '123 New Street, Manila' },
    });
    fireEvent.change(screen.getByLabelText('Hourly Rate (₱)'), {
      target: { value: '55' },
    });
    fireEvent.change(screen.getByLabelText('Latitude'), {
      target: { value: '14.5995' },
    });
    fireEvent.change(screen.getByLabelText('Longitude'), {
      target: { value: '120.9842' },
    });

    const submitButton = screen.getByRole('button', { name: /create slot/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/parking-slots',
        {
          slot_number: 'A004',
          address: '123 New Street, Manila',
          base_hourly_rate: 55,
          latitude: 14.5995,
          longitude: 120.9842,
        },
        expect.any(Object)
      );
    });
  });

  it('validates form fields when creating slot', async () => {
    render(<SlotManagement {...mockProps} />);

    const addButton = screen.getByRole('button', { name: /add new slot/i });
    fireEvent.click(addButton);

    const submitButton = screen.getByRole('button', { name: /create slot/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Slot number is required')).toBeInTheDocument();
      expect(screen.getByText('Address is required')).toBeInTheDocument();
      expect(screen.getByText('Hourly rate is required')).toBeInTheDocument();
    });
  });

  it('opens edit slot modal with pre-filled data', () => {
    render(<SlotManagement {...mockProps} />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Edit Parking Slot')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('updates slot successfully', async () => {
    mockFetch.success({
      id: '1',
      slot_number: 'A001',
      base_hourly_rate: 55.0,
    });

    render(<SlotManagement {...mockProps} />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    const rateInput = screen.getByDisplayValue('50');
    fireEvent.change(rateInput, { target: { value: '55' } });

    const updateButton = screen.getByRole('button', { name: /update slot/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        '/api/parking-slots/1',
        expect.objectContaining({
          base_hourly_rate: 55,
        }),
        expect.any(Object)
      );
    });
  });

  it('changes slot status', async () => {
    render(<SlotManagement {...mockProps} />);

    const statusDropdowns = screen.getAllByTestId('status-dropdown');
    fireEvent.change(statusDropdowns[0], { target: { value: 'maintenance' } });

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        '/api/parking-slots/1',
        { status: 'maintenance' },
        expect.any(Object)
      );
    });
  });

  it('confirms slot deletion', async () => {
    render(<SlotManagement {...mockProps} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete slot A001?')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/api/parking-slots/1');
    });
  });

  it('displays slot performance metrics', () => {
    const slotsWithMetrics = mockSlots.map(slot => ({
      ...slot,
      daily_revenue: 250.0,
      occupancy_rate: 75,
      total_sessions: 12,
    }));

    render(<SlotManagement {...{ ...mockProps, slots: slotsWithMetrics }} />);

    expect(screen.getByText('₱250')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('12 sessions')).toBeInTheDocument();
  });

  it('shows bulk actions for selected slots', () => {
    render(<SlotManagement {...mockProps} />);

    // Select multiple slots
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select first slot
    fireEvent.click(checkboxes[1]); // Select second slot

    expect(screen.getByText('2 slots selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk update status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bulk delete/i })).toBeInTheDocument();
  });

  it('performs bulk status update', async () => {
    render(<SlotManagement {...mockProps} />);

    // Select slots
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);

    const bulkUpdateButton = screen.getByRole('button', { name: /bulk update status/i });
    fireEvent.click(bulkUpdateButton);

    const statusSelect = screen.getByDisplayValue('Select Status');
    fireEvent.change(statusSelect, { target: { value: 'maintenance' } });

    const applyButton = screen.getByRole('button', { name: /apply to selected/i });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        '/api/parking-slots/bulk-update',
        {
          slot_ids: ['1', '2'],
          status: 'maintenance',
        },
        expect.any(Object)
      );
    });
  });

  it('exports slot data', async () => {
    render(<SlotManagement {...mockProps} />);

    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);

    expect(screen.getByText('Export Options')).toBeInTheDocument();

    const csvButton = screen.getByRole('button', { name: /download csv/i });
    fireEvent.click(csvButton);

    await waitFor(() => {
      expect(mockVisit).toHaveBeenCalledWith('/api/parking-slots/export?format=csv');
    });
  });

  it('handles pagination correctly', () => {
    const propsWithPagination = {
      ...mockProps,
      pagination: {
        current_page: 2,
        total: 25,
        per_page: 10,
        last_page: 3,
      },
    };

    render(<SlotManagement {...propsWithPagination} />);

    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('shows loading state during operations', async () => {
    render(<SlotManagement {...mockProps} />);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    const updateButton = screen.getByRole('button', { name: /update slot/i });
    fireEvent.click(updateButton);

    expect(updateButton).toHaveTextContent('Updating...');
    expect(updateButton).toBeDisabled();
  });

  it('displays error messages for failed operations', async () => {
    mockFetch.error(400, 'Slot number already exists');

    render(<SlotManagement {...mockProps} />);

    const addButton = screen.getByRole('button', { name: /add new slot/i });
    fireEvent.click(addButton);

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Slot Number'), {
      target: { value: 'A001' },
    });

    const submitButton = screen.getByRole('button', { name: /create slot/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Slot number already exists')).toBeInTheDocument();
    });
  });

  it('shows slot QR code when requested', () => {
    render(<SlotManagement {...mockProps} />);

    const qrButtons = screen.getAllByRole('button', { name: /qr code/i });
    fireEvent.click(qrButtons[0]);

    expect(screen.getByText('QR Code for Slot A001')).toBeInTheDocument();
    expect(screen.getByTestId('qr-code-display')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download qr/i })).toBeInTheDocument();
  });

  it('handles slot location on map', () => {
    render(<SlotManagement {...mockProps} />);

    const viewMapButtons = screen.getAllByRole('button', { name: /view on map/i });
    fireEvent.click(viewMapButtons[0]);

    expect(screen.getByTestId('slot-location-map')).toBeInTheDocument();
  });
});