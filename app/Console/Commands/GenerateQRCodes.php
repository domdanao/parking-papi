<?php

namespace App\Console\Commands;

use App\Services\QRCodeService;
use Illuminate\Console\Command;

class GenerateQRCodes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'parking:generate-qr-codes';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate QR codes for all approved parking slots';

    /**
     * Execute the console command.
     */
    public function handle(QRCodeService $qrService)
    {
        $this->info('Generating QR codes for all approved parking slots...');

        $results = $qrService->generateQRCodesForAllSlots();

        $successCount = 0;
        $errorCount = 0;

        foreach ($results as $result) {
            if ($result['status'] === 'success') {
                $this->info("✓ Generated QR code for slot {$result['slot_id']} -> {$result['image_path']}");
                $successCount++;
            } else {
                $this->error("✗ Failed to generate QR code for slot {$result['slot_id']}: {$result['error']}");
                $errorCount++;
            }
        }

        $this->newLine();
        $this->info("QR Code generation complete!");
        $this->info("Success: {$successCount}");
        if ($errorCount > 0) {
            $this->warn("Errors: {$errorCount}");
        }

        return Command::SUCCESS;
    }
}