#!/bin/bash

# Conservative cleanup script for production deployment
# Removes only obvious temporary and development files

set -e

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

echo "🧹 AgMCP Development Files Cleanup"
echo "=================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

log_info "Project directory: $PROJECT_DIR"

# Function to safely remove files
safe_remove() {
    local pattern="$1"
    local description="$2"
    
    # Find files matching pattern
    local files=($(find . -maxdepth 1 -name "$pattern" -type f 2>/dev/null))
    
    if [ ${#files[@]} -eq 0 ]; then
        log_info "No $description found"
        return 0
    fi
    
    log_info "Found ${#files[@]} $description:"
    for file in "${files[@]}"; do
        echo "  - $(basename "$file")"
    done
    
    read -p "Remove these $description? (y/N): " confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        for file in "${files[@]}"; do
            rm -f "$file"
            log_success "Removed: $(basename "$file")"
        done
    else
        log_info "Skipped $description"
    fi
    
    echo ""
}

# Function to remove files by list
remove_by_list() {
    local description="$1"
    shift
    local files=("$@")
    
    local existing_files=()
    for file in "${files[@]}"; do
        if [ -f "$file" ]; then
            existing_files+=("$file")
        fi
    done
    
    if [ ${#existing_files[@]} -eq 0 ]; then
        log_info "No $description found"
        return 0
    fi
    
    log_info "Found ${#existing_files[@]} $description:"
    for file in "${existing_files[@]}"; do
        echo "  - $(basename "$file")"
    done
    
    read -p "Remove these $description? (y/N): " confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        for file in "${existing_files[@]}"; do
            rm -f "$file"
            log_success "Removed: $(basename "$file")"
        done
    else
        log_info "Skipped $description"
    fi
    
    echo ""
}

echo "This script will help you clean up development files before production deployment."
echo "You'll be asked to confirm each category of files before removal."
echo ""

# 1. Remove Satshot test files
safe_remove "test-satshot-*.js" "Satshot development test files"

# 2. Remove other test files
test_files=(
    "test-session-token.js"
    "test-session-url.js" 
    "test-simple-auth.js"
    "test-user-info-api.js"
    "test-weather-cycle.js"
    "test-weather-query.js"
)
remove_by_list "miscellaneous test files" "${test_files[@]}"

# 3. Remove debug/utility scripts
debug_files=(
    "show-mcp-qa-results.js"
    "show-raw-request-response.js"
)
remove_by_list "debug/utility scripts" "${debug_files[@]}"

# 4. Remove regression test results
regression_files=(
    "regression-results-2025-06-19T09-38-26-265Z.json"
    "regression-test-results-2025-07-20T15-46-23-396Z.json"
)
remove_by_list "regression test results" "${regression_files[@]}"

# 5. Remove demo files
demo_files=(
    "demo-credentials.md"
)
remove_by_list "demo files" "${demo_files[@]}"

# 6. Remove development documentation (optional)
echo "🔍 Development Documentation Cleanup (Optional)"
echo "================================================"
echo ""
log_warning "The following are development process documents that were created during"
log_warning "the Satshot integration. They're safe to remove but contain useful history:"
echo ""

dev_docs=(
    "SATSHOT_IMMEDIATE_LOGOUT_FIX.md"
    "SATSHOT_INTEGRATION_PLAN.md" 
    "SATSHOT_INTEGRATION_SUMMARY.md"
    "SATSHOT_UI_ENHANCEMENT_PLAN.md"
    "SATSHOT_UI_SIMPLIFICATION.md"
    "SATSHOT_XML_PARSER_FIX.md"
    "satshot-mcp-test-results-summary.md"
    "INTEGRATION_BUTTON_FIX.md"
    "DATABASE_RECOVERY_SUMMARY.md"
    "JOHN_DEERE_API_REGRESSION_SUMMARY.md"
    "JOHN_DEERE_INTEGRATION_REPORT.md"
    "AURAVANT_EXTENSION_SETUP.md"
    "AURAVANT_IMPLEMENTATION_SUMMARY.md"
    "MCP_INTEGRATION_GUIDE.md"
)

existing_dev_docs=()
for doc in "${dev_docs[@]}"; do
    if [ -f "$doc" ]; then
        existing_dev_docs+=("$doc")
    fi
done

if [ ${#existing_dev_docs[@]} -gt 0 ]; then
    log_info "Found ${#existing_dev_docs[@]} development documentation files:"
    for doc in "${existing_dev_docs[@]}"; do
        echo "  - $(basename "$doc")"
    done
    
    echo ""
    log_warning "These files contain development history and process documentation."
    log_warning "They're safe to remove for production, but you might want to keep them."
    echo ""
    
    read -p "Remove development documentation? (y/N): " confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        for doc in "${existing_dev_docs[@]}"; do
            rm -f "$doc"
            log_success "Removed: $(basename "$doc")"
        done
    else
        log_info "Kept development documentation"
    fi
else
    log_info "No development documentation found"
fi

echo ""
echo "🎉 Cleanup process completed!"
echo ""

# Show what's left
log_info "Remaining important files:"
echo "  📚 Core Documentation:"
echo "    - README.md"
echo "    - TECH_STACK.md" 
echo "    - DEPLOYMENT.md"
echo "    - DATABASE_BACKUP_GUIDE.md"
echo "    - SAFE_PRODUCTION_DEPLOYMENT.md"
echo ""
echo "  📁 Reference Documentation (docs/ folder):"
echo "    - API references and integration guides"
echo ""
echo "  🧪 Test Infrastructure:"
echo "    - tests/ directory (Jest tests)"
echo "    - scripts/ directory (operational scripts)"
echo ""

log_success "Repository is now cleaner and ready for production deployment!"
echo ""
echo "🚀 Next steps:"
echo "  1. Review remaining files"
echo "  2. Test the application to ensure nothing is broken"
echo "  3. Commit changes: git add -A && git commit -m 'Clean up development files'"
echo "  4. Deploy to production"
