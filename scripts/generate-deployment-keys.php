<?php

/**
 * Generate required keys for deployment
 * Run this script to generate necessary keys for production deployment
 */

echo "🔑 Generating Deployment Keys for Parking Papi\n";
echo "=============================================\n\n";

// Generate APP_KEY
echo "1. Laravel APP_KEY:\n";
$appKey = 'base64:' . base64_encode(random_bytes(32));
echo "   APP_KEY={$appKey}\n\n";

// Generate Reverb keys
echo "2. Laravel Reverb Keys:\n";
$reverbAppKey = bin2hex(random_bytes(16));
$reverbAppSecret = bin2hex(random_bytes(32));
echo "   REVERB_APP_KEY={$reverbAppKey}\n";
echo "   REVERB_APP_SECRET={$reverbAppSecret}\n\n";

// Generate JWT secret for API tokens
echo "3. JWT Secret (if needed):\n";
$jwtSecret = base64_encode(random_bytes(64));
echo "   JWT_SECRET={$jwtSecret}\n\n";

// Generate encryption key for payment gateway
echo "4. Payment Gateway Encryption Key:\n";
$paymentKey = bin2hex(random_bytes(32));
echo "   PAYMENT_ENCRYPTION_KEY={$paymentKey}\n\n";

echo "📋 Next Steps:\n";
echo "==============\n";
echo "1. Add these keys to your GitHub repository secrets\n";
echo "2. Set these environment variables in Laravel Cloud dashboard\n";
echo "3. Never commit these keys to version control\n";
echo "4. Store them securely in your password manager\n\n";

echo "🚀 Ready for deployment!\n";

// Save keys to a temporary file (will be gitignored)
$keysContent = "# Generated keys for Parking Papi deployment\n";
$keysContent .= "# DO NOT COMMIT THIS FILE\n\n";
$keysContent .= "APP_KEY={$appKey}\n";
$keysContent .= "REVERB_APP_KEY={$reverbAppKey}\n";
$keysContent .= "REVERB_APP_SECRET={$reverbAppSecret}\n";
$keysContent .= "JWT_SECRET={$jwtSecret}\n";
$keysContent .= "PAYMENT_ENCRYPTION_KEY={$paymentKey}\n";

file_put_contents(__DIR__ . '/../.deployment-keys', $keysContent);

echo "📄 Keys saved to .deployment-keys file (not tracked by git)\n";
echo "🔒 Remember to delete this file after setting up deployment\n";
?>