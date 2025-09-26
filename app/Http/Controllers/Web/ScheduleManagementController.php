<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\ParkingSchedule;
use App\Models\ParkingSlot;
use App\Services\RateCalculatorService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ScheduleManagementController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private RateCalculatorService $rateCalculator
    ) {}

    /**
     * Display schedule management dashboard
     */
    public function index(): Response
    {
        $user = auth()->user();

        $slots = ParkingSlot::where('slot_owner_id', $user->id)
            ->with('parkingSchedules')
            ->withCount('parkingSchedules')
            ->get();

        $recentSchedules = ParkingSchedule::whereHas('parkingSlot', function ($query) use ($user) {
            $query->where('slot_owner_id', $user->id);
        })
            ->with('parkingSlot')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        return Inertia::render('Schedules/Index', [
            'slots' => $slots,
            'recentSchedules' => $recentSchedules,
            'stats' => [
                'total_slots' => $slots->count(),
                'scheduled_slots' => $slots->where('parking_schedules_count', '>', 0)->count(),
                'active_schedules' => $recentSchedules->where('is_active', true)->count(),
            ],
        ]);
    }

    /**
     * Show schedule management for a specific slot
     */
    public function show(ParkingSlot $slot): Response
    {
        $this->authorize('update', $slot);

        $schedules = $slot->parkingSchedules()
            ->orderByDesc('priority')
            ->orderByDesc('created_at')
            ->get();

        // Get current rates for preview
        $currentRates = $this->rateCalculator->getCurrentRates($slot, now());
        $upcomingChanges = $this->rateCalculator->getUpcomingChanges($slot, now(), 48);

        return Inertia::render('Schedules/Show', [
            'slot' => $slot->load('slotOwner'),
            'schedules' => $schedules,
            'preview' => [
                'current_rates' => $currentRates,
                'upcoming_changes' => $upcomingChanges,
            ],
            'schedule_templates' => $this->getScheduleTemplates(),
        ]);
    }

    /**
     * Show create schedule form
     */
    public function create(Request $request): Response
    {
        $slotIds = $request->get('slots', []);

        if (! empty($slotIds)) {
            $slots = ParkingSlot::whereIn('id', $slotIds)
                ->where('slot_owner_id', auth()->id())
                ->get();
        } else {
            $slots = ParkingSlot::where('slot_owner_id', auth()->id())->get();
        }

        return Inertia::render('Schedules/Create', [
            'slots' => $slots,
            'selected_slots' => $slotIds,
            'schedule_templates' => $this->getScheduleTemplates(),
        ]);
    }

    /**
     * Store a new schedule
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'slot_ids' => 'required|array',
            'slot_ids.*' => 'exists:parking_slots,id',
            'schedule_type' => 'required|in:availability_window,pricing_tier,free_period,restriction_zone',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'time_rules' => 'required|array',
            'pricing_rules' => 'required|array',
            'recurrence_pattern' => 'required|array',
            'effective_from' => 'required|date',
            'effective_until' => 'nullable|date|after:effective_from',
            'is_active' => 'boolean',
            'priority' => 'integer|min:0|max:100',
        ]);

        // Verify user owns all the slots
        $slots = ParkingSlot::whereIn('id', $validated['slot_ids'])
            ->where('slot_owner_id', auth()->id())
            ->get();

        if ($slots->count() !== count($validated['slot_ids'])) {
            return redirect()->back()->withErrors(['slot_ids' => 'You can only create schedules for your own slots']);
        }

        // Create schedules for each slot
        $createdSchedules = [];
        foreach ($slots as $slot) {
            $schedule = ParkingSchedule::create([
                'parking_slot_id' => $slot->id,
                'schedule_type' => $validated['schedule_type'],
                'name' => $validated['name'],
                'description' => $validated['description'],
                'time_rules' => $validated['time_rules'],
                'pricing_rules' => $validated['pricing_rules'],
                'recurrence_pattern' => $validated['recurrence_pattern'],
                'effective_from' => $validated['effective_from'],
                'effective_until' => $validated['effective_until'],
                'is_active' => $validated['is_active'] ?? true,
                'priority' => $validated['priority'] ?? 0,
            ]);

            $createdSchedules[] = $schedule;
        }

        return redirect()
            ->route('schedules.index')
            ->with('success', 'Schedule created for '.count($createdSchedules).' slot(s)');
    }

    /**
     * Show edit schedule form
     */
    public function edit(ParkingSchedule $schedule): Response
    {
        $this->authorize('update', $schedule->parkingSlot);

        return Inertia::render('Schedules/Edit', [
            'schedule' => $schedule->load('parkingSlot'),
            'schedule_templates' => $this->getScheduleTemplates(),
        ]);
    }

    /**
     * Update schedule
     */
    public function update(Request $request, ParkingSchedule $schedule): RedirectResponse
    {
        $this->authorize('update', $schedule->parkingSlot);

        $validated = $request->validate([
            'schedule_type' => 'required|in:availability_window,pricing_tier,free_period,restriction_zone',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'time_rules' => 'required|array',
            'pricing_rules' => 'required|array',
            'recurrence_pattern' => 'required|array',
            'effective_from' => 'required|date',
            'effective_until' => 'nullable|date|after:effective_from',
            'is_active' => 'boolean',
            'priority' => 'integer|min:0|max:100',
        ]);

        $schedule->update($validated);

        return redirect()
            ->route('schedules.show', $schedule->parkingSlot)
            ->with('success', 'Schedule updated successfully');
    }

    /**
     * Delete schedule
     */
    public function destroy(ParkingSchedule $schedule): RedirectResponse
    {
        $this->authorize('delete', $schedule->parkingSlot);

        $slotId = $schedule->parking_slot_id;
        $schedule->delete();

        return redirect()
            ->route('schedules.show', $slotId)
            ->with('success', 'Schedule deleted successfully');
    }

    /**
     * Preview schedule changes
     */
    public function preview(Request $request): array
    {
        $validated = $request->validate([
            'slot_id' => 'required|exists:parking_slots,id',
            'schedule_type' => 'required|in:availability_window,pricing_tier,free_period,restriction_zone',
            'time_rules' => 'required|array',
            'pricing_rules' => 'required|array',
        ]);

        $slot = ParkingSlot::findOrFail($validated['slot_id']);
        $this->authorize('view', $slot);

        // Create a temporary schedule for preview (don't save)
        $tempSchedule = new ParkingSchedule([
            'parking_slot_id' => $slot->id,
            'schedule_type' => $validated['schedule_type'],
            'time_rules' => $validated['time_rules'],
            'pricing_rules' => $validated['pricing_rules'],
            'effective_from' => now(),
            'effective_until' => now()->addDays(7),
            'is_active' => true,
            'priority' => 1,
        ]);

        // Temporarily add to slot's schedules for calculation
        $slot->setRelation('parkingSchedules', $slot->parkingSchedules->push($tempSchedule));

        $currentRates = $this->rateCalculator->getCurrentRates($slot, now());
        $upcomingChanges = $this->rateCalculator->getUpcomingChanges($slot, now(), 48);

        return [
            'current_rates' => $currentRates,
            'upcoming_changes' => $upcomingChanges,
        ];
    }

    /**
     * Bulk operations on schedules
     */
    public function bulkUpdate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:activate,deactivate,delete',
            'schedule_ids' => 'required|array',
            'schedule_ids.*' => 'exists:parking_schedules,id',
        ]);

        $schedules = ParkingSchedule::whereIn('id', $validated['schedule_ids'])
            ->whereHas('parkingSlot', function ($query) {
                $query->where('slot_owner_id', auth()->id());
            })
            ->get();

        $count = $schedules->count();

        switch ($validated['action']) {
            case 'activate':
                $schedules->each->update(['is_active' => true]);
                $message = "Activated {$count} schedule(s)";
                break;
            case 'deactivate':
                $schedules->each->update(['is_active' => false]);
                $message = "Deactivated {$count} schedule(s)";
                break;
            case 'delete':
                $schedules->each->delete();
                $message = "Deleted {$count} schedule(s)";
                break;
        }

        return redirect()->back()->with('success', $message);
    }

    /**
     * Get predefined schedule templates for large owners
     */
    private function getScheduleTemplates(): array
    {
        return [
            [
                'id' => 'business_hours',
                'name' => 'Business Hours Pricing',
                'description' => 'Higher rates during business hours (8AM-6PM weekdays)',
                'schedule_type' => 'pricing_tier',
                'time_rules' => [
                    'days_of_week' => [1, 2, 3, 4, 5],
                    'start_time' => '08:00:00',
                    'end_time' => '18:00:00',
                ],
                'pricing_rules' => ['hourly_rate' => 100.00],
                'recurrence_pattern' => ['type' => 'weekly'],
            ],
            [
                'id' => 'weekend_free',
                'name' => 'Free Weekend Parking',
                'description' => 'Free parking on weekends',
                'schedule_type' => 'free_period',
                'time_rules' => [
                    'days_of_week' => [0, 6],
                    'start_time' => '00:00:00',
                    'end_time' => '23:59:59',
                ],
                'pricing_rules' => ['message' => 'Free weekend parking'],
                'recurrence_pattern' => ['type' => 'weekly'],
            ],
            [
                'id' => 'rush_hour_restriction',
                'name' => 'Rush Hour No Parking',
                'description' => 'No parking during rush hours (7-9AM, 5-7PM)',
                'schedule_type' => 'restriction_zone',
                'time_rules' => [
                    'days_of_week' => [1, 2, 3, 4, 5],
                    'start_time' => '07:00:00',
                    'end_time' => '09:00:00',
                ],
                'pricing_rules' => ['restriction_message' => 'No parking during morning rush hour'],
                'recurrence_pattern' => ['type' => 'weekly'],
            ],
            [
                'id' => 'overnight_free',
                'name' => 'Free Overnight Parking',
                'description' => 'Free parking from 8PM to 6AM',
                'schedule_type' => 'free_period',
                'time_rules' => [
                    'days_of_week' => [0, 1, 2, 3, 4, 5, 6],
                    'start_time' => '20:00:00',
                    'end_time' => '06:00:00',
                ],
                'pricing_rules' => ['message' => 'Free overnight parking'],
                'recurrence_pattern' => ['type' => 'weekly'],
            ],
        ];
    }
}
