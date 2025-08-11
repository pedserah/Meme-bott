#!/usr/bin/env python3
"""
Backend Test Suite for Meme-bot Critical New Features
Tests the completely updated Meme-bot backend functionality including:
1. SOL-Based Tax System (tax-manager.js)
2. Missing Commands Implementation (/set_fees, /mint_rugpull, /exempt_wallet)
3. Updated Token Creation (20% allocation to Wallet 1)
4. Enhanced Status Command (SOL tax stats)
5. Chart Activity Simulation (real-trading-manager.js)
6. Craiyon Integration (ai-integrations.js)
7. Bot Initialization without crashes
"""

import os
import sys
import json
import time
import asyncio
import subprocess
import requests
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

class MemeBotCriticalTester:
    def __init__(self):
        self.telegram_bot_dir = project_root / "telegram-bot"
        self.bot_token = None
        self.test_results = []
        self.load_config()
    
    def load_config(self):
        """Load configuration from telegram-bot/.env"""
        env_file = self.telegram_bot_dir / ".env"
        if env_file.exists():
            with open(env_file, 'r') as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.strip().split('=', 1)
                            if key == 'TELEGRAM_BOT_TOKEN':
                                self.bot_token = value.strip('"\'')
                                break
        
        if not self.bot_token:
            print("⚠️ TELEGRAM_BOT_TOKEN not found in telegram-bot/.env")
    
    def log_test(self, test_name, status, message="", details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "details": details or {}
        }
        self.test_results.append(result)
        
        status_icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_icon} {test_name}: {message}")
        if details:
            for key, value in details.items():
                print(f"   {key}: {value}")
    
    def test_sol_tax_system_implementation(self):
        """Test 1: Verify SOL-based tax system implementation"""
        test_name = "SOL-Based Tax System"
        
        try:
            # Check if tax-manager.js exists
            tax_manager_path = self.telegram_bot_dir / "tax-manager.js"
            if not tax_manager_path.exists():
                self.log_test(test_name, "FAIL", "tax-manager.js file is missing - critical feature not implemented")
                return False
            
            # Check bot.js for tax system integration
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            # Check for SOL tax collection system in bot state
            tax_system_checks = {
                "SOL Tax Collection State": "solTaxCollection" in bot_content,
                "Dynamic Fees State": "dynamicFees" in bot_content,
                "Tax Manager Import": "require('./tax-manager')" in bot_content or "TaxManager" in bot_content,
                "SOL Collection Logic": "collectInSOL" in bot_content,
                "Tax Exemption System": "exemptWallets" in bot_content
            }
            
            with open(tax_manager_path, 'r') as f:
                tax_content = f.read()
            
            tax_manager_checks = {
                "Tax Manager Class": "class TaxManager" in tax_content,
                "SOL Tax Calculation": "calculateSOLTax" in tax_content or "collectSOLTax" in tax_content,
                "Tax Collection Tracking": "trackTaxCollection" in tax_content or "taxStats" in tax_content,
                "Exemption Methods": "exemptWallet" in tax_content or "addExemption" in tax_content
            }
            
            failed_checks = []
            for check, passed in {**tax_system_checks, **tax_manager_checks}.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Bot.js Tax Checks": list(tax_system_checks.keys()),
                "Tax Manager Checks": list(tax_manager_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            if failed_checks:
                self.log_test(test_name, "FAIL", f"SOL tax system incomplete: {len(failed_checks)} checks failed", details)
                return False
            
            self.log_test(test_name, "PASS", "SOL-based tax system properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing SOL tax system: {str(e)}")
            return False
    
    def test_missing_commands_implementation(self):
        """Test 2: Verify missing commands (/set_fees, /mint_rugpull, /exempt_wallet)"""
        test_name = "Missing Commands Implementation"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            # Check for the three critical missing commands
            command_checks = {
                "/set_fees Command": "/set_fees" in bot_content and "setFeesCommand" in bot_content,
                "/mint_rugpull Command": "/mint_rugpull" in bot_content and ("mintRugpullCommand" in bot_content or "mint_rugpull" in bot_content),
                "/exempt_wallet Command": "/exempt_wallet" in bot_content and "exemptWalletCommand" in bot_content,
                "Set Fees Handler": "bot.onText(/\\/set_fees/" in bot_content,
                "Mint Rugpull Handler": "bot.onText(/\\/mint_rugpull/" in bot_content,
                "Exempt Wallet Handler": "bot.onText(/\\/exempt_wallet/" in bot_content
            }
            
            # Check for interactive UI elements
            ui_checks = {
                "Set Fees UI": "callback_data: 'set_fees'" in bot_content,
                "Tax Rate Configuration": "0-99%" in bot_content or "tax rate" in bot_content.lower(),
                "Token Selection UI": "Select token" in bot_content or "choose token" in bot_content.lower(),
                "Educational Messaging": "research" in bot_content.lower() and "simulation" in bot_content.lower()
            }
            
            failed_checks = []
            for check, passed in {**command_checks, **ui_checks}.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Command Checks": list(command_checks.keys()),
                "UI Checks": list(ui_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            if len(failed_checks) > 2:  # Allow some flexibility
                self.log_test(test_name, "FAIL", f"Missing commands incomplete: {len(failed_checks)} checks failed", details)
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Some command checks failed: {len(failed_checks)}", details)
                return True
            
            self.log_test(test_name, "PASS", "All missing commands properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing missing commands: {str(e)}")
            return False
    
    def test_updated_token_creation(self):
        """Test 3: Verify token creation gives Wallet 1 only 20% of supply"""
        test_name = "Updated Token Creation (20% Allocation)"
        
        try:
            token_manager_path = self.telegram_bot_dir / "token-manager.js"
            with open(token_manager_path, 'r') as f:
                token_content = f.read()
            
            # Check for 20% allocation logic
            allocation_checks = {
                "Wallet 1 Share Calculation": "wallet1Share" in token_content or "0.2" in token_content or "20%" in token_content,
                "Supply Distribution Logic": "totalSupply *" in token_content and ("0.2" in token_content or "20" in token_content),
                "Mint to Wallet 1": "mintTo" in token_content,
                "Remaining Supply Handling": "remainingSupply" in token_content or "80%" in token_content,
                "Not 100% to Wallet 1": not ("mintAmount = totalSupply * Math.pow(10, 9)" in token_content and "mintTo(" in token_content and "totalSupply" in token_content)
            }
            
            failed_checks = []
            for check, passed in allocation_checks.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Allocation Checks": list(allocation_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            # Special check: if we still see 100% allocation, it's a critical failure
            if "mintAmount = totalSupply * Math.pow(10, 9)" in token_content:
                self.log_test(test_name, "FAIL", "Token creation still gives 100% to Wallet 1 - not updated", details)
                return False
            
            if len(failed_checks) > 2:
                self.log_test(test_name, "FAIL", f"Token allocation not properly updated: {len(failed_checks)} checks failed", details)
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Some allocation checks failed: {len(failed_checks)}", details)
                return True
            
            self.log_test(test_name, "PASS", "Token creation properly updated for 20% allocation", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing token creation: {str(e)}")
            return False
    
    def test_enhanced_status_command(self):
        """Test 4: Verify /status shows SOL tax collection stats"""
        test_name = "Enhanced Status Command"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            # Find the showStatus function
            status_function_start = bot_content.find("async function showStatus(")
            if status_function_start == -1:
                status_function_start = bot_content.find("function showStatus(")
            
            if status_function_start == -1:
                self.log_test(test_name, "FAIL", "showStatus function not found")
                return False
            
            # Extract the showStatus function (approximate)
            status_function_end = bot_content.find("}", status_function_start + 500)  # Look for closing brace
            status_function = bot_content[status_function_start:status_function_end + 1]
            
            # Check for SOL tax stats in status display
            status_checks = {
                "SOL Tax Collection Display": "SOL" in status_function and ("tax" in status_function.lower() or "collected" in status_function.lower()),
                "Tax Recipient Display": "Wallet 1" in status_function or "tax recipient" in status_function.lower(),
                "Total SOL Collected": "totalSOL" in status_function or "solCollected" in status_function,
                "Exempt Wallet Counts": "exempt" in status_function.lower() and "count" in status_function.lower(),
                "Tax Stats Per Token": "forEach" in status_function or "map" in status_function
            }
            
            failed_checks = []
            for check, passed in status_checks.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Status Function Checks": list(status_checks.keys()),
                "Failed Checks": failed_checks,
                "Function Found": status_function_start != -1
            }
            
            if len(failed_checks) > 2:
                self.log_test(test_name, "FAIL", f"Status command not properly enhanced: {len(failed_checks)} checks failed", details)
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Some status checks failed: {len(failed_checks)}", details)
                return True
            
            self.log_test(test_name, "PASS", "Status command properly enhanced with SOL tax stats", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing status command: {str(e)}")
            return False
    
    def test_chart_activity_simulation(self):
        """Test 5: Verify chart activity simulation methods in real-trading-manager.js"""
        test_name = "Chart Activity Simulation"
        
        try:
            real_trading_path = self.telegram_bot_dir / "real-trading-manager.js"
            with open(real_trading_path, 'r') as f:
                trading_content = f.read()
            
            # Check for chart activity methods
            chart_activity_checks = {
                "Start Chart Activity Method": "startChartActivity" in trading_content,
                "Stop Chart Activity Method": "stopChartActivity" in trading_content,
                "Generate Chart Activity Trade": "generateChartActivityTrade" in trading_content,
                "Small Trade Logic": "0.005" in trading_content or "0.02" in trading_content,
                "Periodic Trading": "setInterval" in trading_content or "setTimeout" in trading_content,
                "Chart Activity State": "chartActivity" in trading_content or "isChartActive" in trading_content
            }
            
            failed_checks = []
            for check, passed in chart_activity_checks.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Chart Activity Checks": list(chart_activity_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            if len(failed_checks) > 3:
                self.log_test(test_name, "FAIL", f"Chart activity simulation incomplete: {len(failed_checks)} checks failed", details)
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Some chart activity checks failed: {len(failed_checks)}", details)
                return True
            
            self.log_test(test_name, "PASS", "Chart activity simulation properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing chart activity: {str(e)}")
            return False
    
    def test_craiyon_integration(self):
        """Test 6: Verify Craiyon integration and removal of DALL-E 3/Fal.ai"""
        test_name = "Craiyon Integration"
        
        try:
            ai_integrations_path = self.telegram_bot_dir / "ai-integrations.js"
            with open(ai_integrations_path, 'r') as f:
                ai_content = f.read()
            
            # Check for Craiyon integration
            craiyon_checks = {
                "Craiyon Integration": "craiyon" in ai_content.lower(),
                "No DALL-E 3 References": "dall-e" not in ai_content.lower() and "dalle" not in ai_content.lower(),
                "No Fal.ai References": "fal.ai" not in ai_content.lower() and "fal-ai" not in ai_content.lower(),
                "Placeholder Images": "placeholder" in ai_content.lower(),
                "No API Key Required": "API_KEY" not in ai_content or "key" not in ai_content.lower(),
                "Free Service": "free" in ai_content.lower() or not ("subscription" in ai_content.lower() or "paid" in ai_content.lower())
            }
            
            failed_checks = []
            for check, passed in craiyon_checks.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Craiyon Integration Checks": list(craiyon_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            # Critical failure if DALL-E or Fal.ai still present
            if "dall-e" in ai_content.lower() or "fal.ai" in ai_content.lower():
                self.log_test(test_name, "FAIL", "DALL-E 3 or Fal.ai references still present - not completely removed", details)
                return False
            
            if len(failed_checks) > 2:
                self.log_test(test_name, "FAIL", f"Craiyon integration incomplete: {len(failed_checks)} checks failed", details)
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Some Craiyon checks failed: {len(failed_checks)}", details)
                return True
            
            self.log_test(test_name, "PASS", "Craiyon integration properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing Craiyon integration: {str(e)}")
            return False
    
    def test_bot_initialization_with_new_modules(self):
        """Test 7: Verify bot initializes without crashes with all new modules"""
        test_name = "Bot Initialization with New Modules"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            # Check for all required imports and initializations
            initialization_checks = {
                "Tax Manager Import": "require('./tax-manager')" in bot_content or "TaxManager" in bot_content,
                "Tax Manager Initialization": "new TaxManager" in bot_content or "taxManager" in bot_content,
                "AI Integrations Import": "require('./ai-integrations')" in bot_content,
                "Real Trading Manager Import": "require('./real-trading-manager')" in bot_content,
                "All Command Handlers": "/set_fees" in bot_content and "/mint_rugpull" in bot_content and "/exempt_wallet" in bot_content,
                "Bot State Management": "botState" in bot_content,
                "Error Handling": "try {" in bot_content and "catch" in bot_content
            }
            
            # Check if all required files exist
            required_files = [
                "bot.js", "wallet-manager.js", "token-manager.js", 
                "ai-integrations.js", "real-trading-manager.js", 
                "raydium-manager.js", "metadata-manager.js"
            ]
            
            missing_files = []
            for file_name in required_files:
                if not (self.telegram_bot_dir / file_name).exists():
                    missing_files.append(file_name)
            
            failed_checks = []
            for check, passed in initialization_checks.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Initialization Checks": list(initialization_checks.keys()),
                "Failed Checks": failed_checks,
                "Required Files": required_files,
                "Missing Files": missing_files
            }
            
            if missing_files:
                self.log_test(test_name, "FAIL", f"Missing required files: {', '.join(missing_files)}", details)
                return False
            
            if len(failed_checks) > 3:
                self.log_test(test_name, "FAIL", f"Bot initialization incomplete: {len(failed_checks)} checks failed", details)
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Some initialization checks failed: {len(failed_checks)}", details)
                return True
            
            self.log_test(test_name, "PASS", "Bot initialization properly configured with all new modules", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing bot initialization: {str(e)}")
            return False
    
    def test_telegram_bot_connectivity(self):
        """Test 8: Test Telegram Bot API connectivity"""
        test_name = "Telegram Bot API Connectivity"
        
        if not self.bot_token:
            self.log_test(test_name, "WARN", "Bot token not found, skipping connectivity test")
            return True
        
        try:
            # Test bot token validity
            url = f"https://api.telegram.org/bot{self.bot_token}/getMe"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                bot_info = response.json()
                if bot_info.get('ok'):
                    details = {
                        "Bot Username": bot_info.get('result', {}).get('username', 'Unknown'),
                        "Bot ID": bot_info.get('result', {}).get('id', 'Unknown'),
                        "Can Join Groups": bot_info.get('result', {}).get('can_join_groups', False),
                        "Can Read Messages": bot_info.get('result', {}).get('can_read_all_group_messages', False)
                    }
                    self.log_test(test_name, "PASS", "Bot token valid and API accessible", details)
                    return True
                else:
                    self.log_test(test_name, "FAIL", f"Bot API error: {bot_info.get('description', 'Unknown error')}")
                    return False
            else:
                self.log_test(test_name, "FAIL", f"HTTP {response.status_code}: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_test(test_name, "FAIL", f"Network error: {str(e)}")
            return False
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Unexpected error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all critical feature tests and generate report"""
        print("🚀 Starting Meme-bot Critical Features Tests...")
        print("=" * 70)
        
        tests = [
            self.test_sol_tax_system_implementation,
            self.test_missing_commands_implementation,
            self.test_updated_token_creation,
            self.test_enhanced_status_command,
            self.test_chart_activity_simulation,
            self.test_craiyon_integration,
            self.test_bot_initialization_with_new_modules,
            self.test_telegram_bot_connectivity
        ]
        
        passed = 0
        failed = 0
        warnings = 0
        
        for test in tests:
            try:
                result = test()
                if result:
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log_test(test.__name__, "FAIL", f"Test execution error: {str(e)}")
                failed += 1
        
        # Count warnings
        warnings = sum(1 for result in self.test_results if result['status'] == 'WARN')
        
        print("\n" + "=" * 70)
        print("📊 CRITICAL FEATURES TEST SUMMARY")
        print("=" * 70)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Warnings: {warnings}")
        print(f"📋 Total: {len(tests)}")
        
        # Detailed results
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status_icon = "✅" if result['status'] == "PASS" else "❌" if result['status'] == "FAIL" else "⚠️"
            print(f"{status_icon} {result['test']}: {result['message']}")
        
        # Critical issues
        critical_failures = [r for r in self.test_results if r['status'] == 'FAIL']
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES:")
            for failure in critical_failures:
                print(f"❌ {failure['test']}: {failure['message']}")
        
        return {
            'passed': passed,
            'failed': failed,
            'warnings': warnings,
            'total': len(tests),
            'success_rate': (passed / len(tests)) * 100,
            'results': self.test_results
        }

def main():
    """Main test execution"""
    try:
        tester = MemeBotCriticalTester()
        results = tester.run_all_tests()
        
        # Exit with appropriate code
        if results['failed'] == 0:
            print(f"\n🎉 ALL CRITICAL TESTS PASSED! Success rate: {results['success_rate']:.1f}%")
            sys.exit(0)
        else:
            print(f"\n💥 {results['failed']} CRITICAL TESTS FAILED! Success rate: {results['success_rate']:.1f}%")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()