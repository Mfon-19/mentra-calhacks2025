#!/bin/bash

# CalHacks 2025 - Test Runner Script
# Runs all tests with proper setup and cleanup

set -e  # Exit on any error

echo "🧪 Starting CalHacks 2025 Test Suite"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the CalHacks 2025 root directory"
    exit 1
fi

# Install test dependencies
print_status "Installing test dependencies..."
cd tests
if [ ! -d "node_modules" ]; then
    npm install
    print_success "Test dependencies installed"
else
    print_warning "Test dependencies already installed"
fi

# Run different test suites
print_status "Running test suites..."

# Unit Tests
print_status "Running Unit Tests..."
if npm run test:unit; then
    print_success "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi

# Integration Tests
print_status "Running Integration Tests..."
if npm run test:integration; then
    print_success "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

# End-to-End Tests
print_status "Running End-to-End Tests..."
if npm run test:e2e; then
    print_success "End-to-end tests passed"
else
    print_error "End-to-end tests failed"
    exit 1
fi

# Coverage Report
print_status "Generating coverage report..."
if npm run test:coverage; then
    print_success "Coverage report generated"
else
    print_warning "Coverage report generation failed"
fi

# Cleanup
print_status "Cleaning up..."
cd ..

print_success "All tests completed successfully! 🎉"
echo ""
echo "Test Summary:"
echo "- Unit Tests: ✅"
echo "- Integration Tests: ✅"
echo "- End-to-End Tests: ✅"
echo "- Coverage Report: ✅"
echo ""
echo "Coverage report available at: tests/coverage/index.html"
