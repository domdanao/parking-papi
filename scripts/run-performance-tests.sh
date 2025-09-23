#!/bin/bash

# Performance Testing Suite for Parking Platform
# This script runs comprehensive performance tests including load testing, stress testing, and database benchmarks

set -e

echo "🚀 Starting Performance Testing Suite for Parking Platform"
echo "=========================================="

# Configuration
BASE_URL=${BASE_URL:-"http://localhost:8000"}
TEST_RESULTS_DIR="test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create results directory
mkdir -p $TEST_RESULTS_DIR

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."

    # Check if application is running
    if ! curl -s "$BASE_URL" > /dev/null; then
        log_error "Application is not running at $BASE_URL"
        log_info "Please start the application with: php artisan serve"
        exit 1
    fi

    # Check for JMeter
    if ! command -v jmeter &> /dev/null; then
        log_warning "JMeter not found. Skipping JMeter tests."
        SKIP_JMETER=true
    fi

    # Check for k6
    if ! command -v k6 &> /dev/null; then
        log_warning "k6 not found. Installing k6..."

        # Install k6 (macOS)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew &> /dev/null; then
                brew install k6
            else
                log_error "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
                exit 1
            fi
        else
            log_error "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
            exit 1
        fi
    fi

    log_success "Dependencies checked"
}

# Setup test environment
setup_test_environment() {
    log_info "Setting up test environment..."

    # Clear cache
    php artisan cache:clear
    php artisan config:clear
    php artisan route:clear

    # Optimize for testing
    php artisan config:cache
    php artisan route:cache

    # Setup test database
    php artisan migrate:fresh --env=testing --force
    php artisan db:seed --env=testing --force

    log_success "Test environment setup complete"
}

# Run database performance tests
run_database_performance_tests() {
    log_info "Running database performance tests..."

    php artisan test tests/performance/database-performance.php \
        --testdox \
        --log-junit="$TEST_RESULTS_DIR/database-performance-$TIMESTAMP.xml" \
        --coverage-html="$TEST_RESULTS_DIR/database-coverage-$TIMESTAMP"

    if [ $? -eq 0 ]; then
        log_success "Database performance tests completed"
    else
        log_error "Database performance tests failed"
        return 1
    fi
}

# Run API load tests with k6
run_k6_stress_tests() {
    log_info "Running k6 stress tests..."

    k6 run \
        --env BASE_URL="$BASE_URL" \
        --summary-export="$TEST_RESULTS_DIR/k6-summary-$TIMESTAMP.json" \
        --out json="$TEST_RESULTS_DIR/k6-results-$TIMESTAMP.json" \
        tests/performance/stress-test.js

    if [ $? -eq 0 ]; then
        log_success "k6 stress tests completed"
    else
        log_error "k6 stress tests failed"
        return 1
    fi
}

# Run JMeter load tests
run_jmeter_load_tests() {
    if [ "$SKIP_JMETER" = true ]; then
        log_warning "Skipping JMeter tests (not installed)"
        return 0
    fi

    log_info "Running JMeter load tests..."

    jmeter -n -t tests/performance/load-test-plan.jmx \
        -l "$TEST_RESULTS_DIR/jmeter-results-$TIMESTAMP.jtl" \
        -e -o "$TEST_RESULTS_DIR/jmeter-dashboard-$TIMESTAMP" \
        -Jhost=localhost \
        -Jport=8000

    if [ $? -eq 0 ]; then
        log_success "JMeter load tests completed"
    else
        log_error "JMeter load tests failed"
        return 1
    fi
}

# Monitor system resources during tests
monitor_resources() {
    log_info "Starting resource monitoring..."

    # Start monitoring in background
    (
        echo "timestamp,cpu_percent,memory_percent,disk_io" > "$TEST_RESULTS_DIR/resource-monitor-$TIMESTAMP.csv"

        while true; do
            timestamp=$(date '+%Y-%m-%d %H:%M:%S')

            # Get CPU usage
            if [[ "$OSTYPE" == "darwin"* ]]; then
                cpu=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
                memory=$(vm_stat | grep "Pages active" | awk '{print $3}' | sed 's/\.//')
            else
                cpu=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
                memory=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
            fi

            echo "$timestamp,$cpu,$memory,0" >> "$TEST_RESULTS_DIR/resource-monitor-$TIMESTAMP.csv"
            sleep 5
        done
    ) &

    MONITOR_PID=$!
    echo $MONITOR_PID > "$TEST_RESULTS_DIR/monitor.pid"
}

# Stop resource monitoring
stop_monitoring() {
    if [ -f "$TEST_RESULTS_DIR/monitor.pid" ]; then
        MONITOR_PID=$(cat "$TEST_RESULTS_DIR/monitor.pid")
        kill $MONITOR_PID 2>/dev/null || true
        rm "$TEST_RESULTS_DIR/monitor.pid"
        log_info "Resource monitoring stopped"
    fi
}

# Generate performance report
generate_performance_report() {
    log_info "Generating performance report..."

    cat > "$TEST_RESULTS_DIR/performance-report-$TIMESTAMP.html" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Performance Test Report - $TIMESTAMP</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
        .pass { background-color: #d4edda; border-color: #c3e6cb; }
        .fail { background-color: #f8d7da; border-color: #f5c6cb; }
        .warning { background-color: #fff3cd; border-color: #ffeaa7; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Performance Test Report</h1>
    <p><strong>Timestamp:</strong> $TIMESTAMP</p>
    <p><strong>Base URL:</strong> $BASE_URL</p>

    <div class="section">
        <h2>Test Summary</h2>
        <ul>
            <li>Database Performance Tests: $([ -f "$TEST_RESULTS_DIR/database-performance-$TIMESTAMP.xml" ] && echo "✅ Completed" || echo "❌ Failed")</li>
            <li>k6 Stress Tests: $([ -f "$TEST_RESULTS_DIR/k6-summary-$TIMESTAMP.json" ] && echo "✅ Completed" || echo "❌ Failed")</li>
            <li>JMeter Load Tests: $([ "$SKIP_JMETER" = true ] && echo "⚠️  Skipped" || ([ -f "$TEST_RESULTS_DIR/jmeter-results-$TIMESTAMP.jtl" ] && echo "✅ Completed" || echo "❌ Failed"))</li>
        </ul>
    </div>

    <div class="section">
        <h2>Performance Metrics</h2>
        <p>Detailed metrics can be found in the individual test result files:</p>
        <ul>
            <li><a href="k6-summary-$TIMESTAMP.json">k6 Summary Report</a></li>
            $([ "$SKIP_JMETER" != true ] && echo "<li><a href=\"jmeter-dashboard-$TIMESTAMP/index.html\">JMeter Dashboard</a></li>")
            <li><a href="database-coverage-$TIMESTAMP/index.html">Database Coverage Report</a></li>
        </ul>
    </div>

    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            <li>Monitor response times under load and optimize slow queries</li>
            <li>Implement proper caching strategies for frequently accessed data</li>
            <li>Consider database connection pooling for high concurrent loads</li>
            <li>Set up monitoring and alerting for production performance metrics</li>
        </ul>
    </div>
</body>
</html>
EOF

    log_success "Performance report generated: $TEST_RESULTS_DIR/performance-report-$TIMESTAMP.html"
}

# Cleanup function
cleanup() {
    stop_monitoring

    # Restore application state
    php artisan cache:clear
    php artisan config:clear
    php artisan route:clear

    log_info "Cleanup completed"
}

# Trap cleanup on exit
trap cleanup EXIT

# Main execution
main() {
    echo "Starting performance test suite..."
    echo "Results will be saved to: $TEST_RESULTS_DIR"
    echo

    check_dependencies
    setup_test_environment

    # Start resource monitoring
    monitor_resources

    # Run performance tests
    local failed_tests=0

    if ! run_database_performance_tests; then
        ((failed_tests++))
    fi

    if ! run_k6_stress_tests; then
        ((failed_tests++))
    fi

    if ! run_jmeter_load_tests; then
        ((failed_tests++))
    fi

    # Stop monitoring
    stop_monitoring

    # Generate report
    generate_performance_report

    # Summary
    echo
    echo "=========================================="
    if [ $failed_tests -eq 0 ]; then
        log_success "All performance tests completed successfully!"
    else
        log_warning "$failed_tests test suite(s) failed"
    fi

    echo "📊 Results location: $TEST_RESULTS_DIR"
    echo "📈 Performance report: $TEST_RESULTS_DIR/performance-report-$TIMESTAMP.html"

    if [ "$SKIP_JMETER" != true ] && [ -f "$TEST_RESULTS_DIR/jmeter-dashboard-$TIMESTAMP/index.html" ]; then
        echo "📊 JMeter dashboard: $TEST_RESULTS_DIR/jmeter-dashboard-$TIMESTAMP/index.html"
    fi

    return $failed_tests
}

# Run main function
main "$@"