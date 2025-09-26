<?php

namespace App\Console\Commands;

use App\Services\SessionTransitionService;
use Illuminate\Console\Command;

class ProcessSessionTransitions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'parking:process-transitions
                            {--notify : Send rate change notifications}
                            {--dry-run : Run without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process rate transitions for active parking sessions and send notifications';

    public function __construct(
        private SessionTransitionService $transitionService
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Processing session transitions...');

        $isDryRun = $this->option('dry-run');
        $shouldNotify = $this->option('notify');

        if ($isDryRun) {
            $this->warn('Running in DRY RUN mode - no changes will be made');
        }

        // Process active session transitions
        $transitions = [];
        if (! $isDryRun) {
            $transitions = $this->transitionService->processActiveSessionTransitions();
        }

        $this->info('Found '.count($transitions).' sessions with rate transitions');

        if (! empty($transitions)) {
            $this->table(
                ['Session ID', 'Transition Type', 'Amount Difference', 'New Rate'],
                collect($transitions)->map(function ($transition) {
                    return [
                        $transition['session_id'],
                        $transition['transition_type'],
                        '₱'.number_format($transition['amount_difference'], 2),
                        '₱'.number_format($transition['new_total'], 2),
                    ];
                })->toArray()
            );
        }

        // Send rate change notifications
        $notificationsSent = 0;
        if ($shouldNotify && ! $isDryRun) {
            $this->info('Sending rate change notifications...');
            $notificationsSent = $this->transitionService->sendRateChangeNotifications();
        }

        $this->info("Processed {count($transitions)} transitions");

        if ($shouldNotify) {
            $this->info("Sent {$notificationsSent} notifications");
        }

        return self::SUCCESS;
    }
}
