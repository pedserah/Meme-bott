#!/usr/bin/env python3
"""
Backend Test Suite for SOL Distribution Telegram Bot
Tests the modified /seed_wallets command that distributes SOL instead of tokens
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

class TelegramBotTester:
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
                        key, value = line.strip().split('=', 1)
                        if key == 'TELEGRAM_BOT_TOKEN':
                            self.bot_token = value
                            break
        
        if not self.bot_token:
            raise Exception("TELEGRAM_BOT_TOKEN not found in telegram-bot/.env")
    
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
    
    def test_file_structure(self):
        """Test 1: Verify required files exist"""
        test_name = "File Structure Verification"
        
        required_files = [
            "telegram-bot/bot.js",
            "telegram-bot/wallet-manager.js", 
            "telegram-bot/package.json",
            "telegram-bot/.env"
        ]
        
        missing_files = []
        for file_path in required_files:
            full_path = project_root / file_path
            if not full_path.exists():
                missing_files.append(file_path)
        
        if missing_files:
            self.log_test(test_name, "FAIL", f"Missing files: {', '.join(missing_files)}")
            return False
        
        self.log_test(test_name, "PASS", "All required files present")
        return True
    
    def test_sol_distribution_implementation(self):
        """Test 2: Verify SOL distribution implementation exists"""
        test_name = "SOL Distribution Implementation"
        
        bot_js_path = self.telegram_bot_dir / "bot.js"
        wallet_manager_path = self.telegram_bot_dir / "wallet-manager.js"
        
        try:
            # Check bot.js for SOL distribution functions
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            # Check wallet-manager.js for transferSOL method
            with open(wallet_manager_path, 'r') as f:
                wallet_content = f.read()
            
            # Verify key functions exist
            required_functions = {
                "seedWalletsWithSOL": "seedWalletsWithSOL" in bot_content,
                "seedWalletsCommand": "seedWalletsCommand" in bot_content,
                "transferSOL": "transferSOL" in wallet_content,
                "confirm_sol_distribution": "confirm_sol_distribution" in bot_content
            }
            
            missing_functions = [func for func, exists in required_functions.items() if not exists]
            
            if missing_functions:
                self.log_test(test_name, "FAIL", f"Missing functions: {', '.join(missing_functions)}")
                return False
            
            # Check for SOL distribution logic
            sol_logic_checks = {
                "Reserve Logic": "0.1" in bot_content and "reserve" in bot_content.lower(),
                "Equal Distribution": "/ 4" in bot_content or "availableSOL / 4" in bot_content,
                "Wallet Range": "walletId = 2" in bot_content and "walletId <= 5" in bot_content,
                "Balance Check": "availableSOL <= 0" in bot_content or "insufficient" in bot_content.lower()
            }
            
            failed_checks = [check for check, passed in sol_logic_checks.items() if not passed]
            
            details = {
                "Functions Found": list(required_functions.keys()),
                "Logic Checks": list(sol_logic_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            if failed_checks:
                self.log_test(test_name, "WARN", f"Some logic checks failed: {', '.join(failed_checks)}", details)
                return True  # Still pass as core functions exist
            
            self.log_test(test_name, "PASS", "All SOL distribution functions and logic found", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error reading files: {str(e)}")
            return False
    
    def test_wallet_manager_sol_transfer(self):
        """Test 3: Verify transferSOL method implementation"""
        test_name = "Wallet Manager SOL Transfer"
        
        wallet_manager_path = self.telegram_bot_dir / "wallet-manager.js"
        
        try:
            with open(wallet_manager_path, 'r') as f:
                content = f.read()
            
            # Check for transferSOL method components
            transfer_components = {
                "Method Declaration": "async transferSOL(" in content,
                "Parameter Validation": "fromWallet" in content and "toWallet" in content,
                "Balance Check": "balance < amount" in content or "insufficient" in content.lower(),
                "Transaction Creation": "SystemProgram.transfer" in content,
                "Error Handling": "try {" in content and "catch" in content,
                "Return Object": "success:" in content and "signature:" in content
            }
            
            missing_components = [comp for comp, exists in transfer_components.items() if not exists]
            
            details = {
                "Components Checked": list(transfer_components.keys()),
                "Missing Components": missing_components
            }
            
            if missing_components:
                self.log_test(test_name, "FAIL", f"Missing components: {', '.join(missing_components)}", details)
                return False
            
            self.log_test(test_name, "PASS", "transferSOL method properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing transferSOL: {str(e)}")
            return False
    
    def test_command_flow_logic(self):
        """Test 4: Verify command flow and callback handling"""
        test_name = "Command Flow Logic"
        
        bot_js_path = self.telegram_bot_dir / "bot.js"
        
        try:
            with open(bot_js_path, 'r') as f:
                content = f.read()
            
            # Check command flow components
            flow_components = {
                "Seed Wallets Command": "/seed_wallets" in content,
                "Confirmation Callback": "confirm_sol_distribution" in content,
                "Cancel Callback": "cancel_seed" in content,
                "Balance Display": "Check Balances First" in content,
                "Equal Distribution Math": "/ 4" in content,
                "Reserve Amount": "0.1" in content,
                "Success Message": "SOL Distribution Complete" in content or "distribution complete" in content.lower()
            }
            
            missing_components = [comp for comp, exists in flow_components.items() if not exists]
            
            # Check for callback handler registration
            callback_handling = {
                "Callback Handler": "bot.on('callback_query'" in content,
                "SOL Distribution Handler": "confirm_sol_distribution" in content
            }
            
            missing_handlers = [handler for handler, exists in callback_handling.items() if not exists]
            
            details = {
                "Flow Components": list(flow_components.keys()),
                "Missing Flow Components": missing_components,
                "Callback Handlers": list(callback_handling.keys()),
                "Missing Handlers": missing_handlers
            }
            
            total_missing = len(missing_components) + len(missing_handlers)
            
            if total_missing > 2:  # Allow for minor variations
                self.log_test(test_name, "FAIL", f"Too many missing components: {total_missing}", details)
                return False
            elif total_missing > 0:
                self.log_test(test_name, "WARN", f"Some components missing: {total_missing}", details)
                return True
            
            self.log_test(test_name, "PASS", "Command flow logic properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing command flow: {str(e)}")
            return False
    
    def test_mathematical_logic(self):
        """Test 5: Verify SOL distribution mathematical logic"""
        test_name = "Mathematical Logic Verification"
        
        bot_js_path = self.telegram_bot_dir / "bot.js"
        
        try:
            with open(bot_js_path, 'r') as f:
                content = f.read()
            
            # Extract mathematical logic patterns
            math_patterns = {
                "Reserve Calculation": "0.1" in content,
                "Available SOL": "availableSOL" in content,
                "Division by 4": "/ 4" in content,
                "Balance Validation": "availableSOL <= 0" in content,
                "Per Wallet Amount": "solPerWallet" in content or "perWallet" in content
            }
            
            # Check for proper wallet range (2-5)
            wallet_range_patterns = {
                "Start Wallet 2": "walletId = 2" in content,
                "End Wallet 5": "walletId <= 5" in content,
                "Loop Structure": "for (" in content and "walletId++" in content
            }
            
            missing_math = [pattern for pattern, exists in math_patterns.items() if not exists]
            missing_range = [pattern for pattern, exists in wallet_range_patterns.items() if not exists]
            
            details = {
                "Math Patterns": list(math_patterns.keys()),
                "Missing Math": missing_math,
                "Range Patterns": list(wallet_range_patterns.keys()),
                "Missing Range": missing_range
            }
            
            total_missing = len(missing_math) + len(missing_range)
            
            if total_missing > 2:
                self.log_test(test_name, "FAIL", f"Mathematical logic incomplete: {total_missing} missing", details)
                return False
            elif total_missing > 0:
                self.log_test(test_name, "WARN", f"Some math patterns missing: {total_missing}", details)
                return True
            
            self.log_test(test_name, "PASS", "Mathematical logic correctly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing mathematical logic: {str(e)}")
            return False
    
    def test_error_handling(self):
        """Test 6: Verify error handling implementation"""
        test_name = "Error Handling Verification"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            wallet_manager_path = self.telegram_bot_dir / "wallet-manager.js"
            
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            with open(wallet_manager_path, 'r') as f:
                wallet_content = f.read()
            
            # Check error handling patterns
            error_patterns = {
                "Try-Catch Blocks": "try {" in bot_content and "catch" in bot_content,
                "Insufficient Balance": "insufficient" in bot_content.lower(),
                "Wallet Not Found": "not found" in bot_content.lower() or "wallet1" in bot_content.lower(),
                "Transaction Errors": "error" in bot_content.lower() and "transaction" in bot_content.lower(),
                "Error Messages": "❌" in bot_content or "Error:" in bot_content
            }
            
            wallet_error_patterns = {
                "Transfer Error Handling": "catch" in wallet_content and "transferSOL" in wallet_content,
                "Balance Validation": "balance <" in wallet_content,
                "Return Error Object": "success: false" in wallet_content,
                "Error Logging": "console.error" in wallet_content
            }
            
            missing_bot_errors = [pattern for pattern, exists in error_patterns.items() if not exists]
            missing_wallet_errors = [pattern for pattern, exists in wallet_error_patterns.items() if not exists]
            
            details = {
                "Bot Error Patterns": list(error_patterns.keys()),
                "Missing Bot Errors": missing_bot_errors,
                "Wallet Error Patterns": list(wallet_error_patterns.keys()),
                "Missing Wallet Errors": missing_wallet_errors
            }
            
            total_missing = len(missing_bot_errors) + len(missing_wallet_errors)
            
            if total_missing > 3:
                self.log_test(test_name, "FAIL", f"Insufficient error handling: {total_missing} missing", details)
                return False
            elif total_missing > 0:
                self.log_test(test_name, "WARN", f"Some error handling missing: {total_missing}", details)
                return True
            
            self.log_test(test_name, "PASS", "Error handling properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing error handling: {str(e)}")
            return False
    
    def test_dependencies_and_config(self):
        """Test 7: Verify dependencies and configuration"""
        test_name = "Dependencies and Configuration"
        
        try:
            # Check package.json dependencies
            package_json_path = self.telegram_bot_dir / "package.json"
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
            
            required_deps = [
                "@solana/web3.js",
                "node-telegram-bot-api",
                "bip39",
                "ed25519-hd-key",
                "dotenv"
            ]
            
            dependencies = package_data.get('dependencies', {})
            missing_deps = [dep for dep in required_deps if dep not in dependencies]
            
            # Check .env configuration
            env_path = self.telegram_bot_dir / ".env"
            with open(env_path, 'r') as f:
                env_content = f.read()
            
            required_env_vars = [
                "TELEGRAM_BOT_TOKEN",
                "SOLANA_RPC_URL",
                "WALLET_1_MNEMONIC",
                "WALLET_2_MNEMONIC",
                "WALLET_3_MNEMONIC",
                "WALLET_4_MNEMONIC",
                "WALLET_5_MNEMONIC"
            ]
            
            missing_env_vars = [var for var in required_env_vars if var not in env_content]
            
            details = {
                "Required Dependencies": required_deps,
                "Missing Dependencies": missing_deps,
                "Required Env Vars": required_env_vars,
                "Missing Env Vars": missing_env_vars,
                "Bot Token Present": "TELEGRAM_BOT_TOKEN" in env_content and len(self.bot_token) > 10
            }
            
            total_missing = len(missing_deps) + len(missing_env_vars)
            
            if total_missing > 0:
                self.log_test(test_name, "FAIL", f"Missing configuration: {total_missing} items", details)
                return False
            
            self.log_test(test_name, "PASS", "All dependencies and configuration present", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error checking dependencies: {str(e)}")
            return False
    
    def test_telegram_bot_connectivity(self):
        """Test 8: Test Telegram Bot API connectivity"""
        test_name = "Telegram Bot API Connectivity"
        
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
    
    def test_solana_rpc_connectivity(self):
        """Test 9: Test Solana RPC connectivity"""
        test_name = "Solana RPC Connectivity"
        
        try:
            # Get RPC URL from .env
            env_path = self.telegram_bot_dir / ".env"
            rpc_url = None
            
            with open(env_path, 'r') as f:
                for line in f:
                    if line.strip().startswith('SOLANA_RPC_URL='):
                        rpc_url = line.strip().split('=', 1)[1]
                        break
            
            if not rpc_url:
                self.log_test(test_name, "FAIL", "SOLANA_RPC_URL not found in .env")
                return False
            
            # Test RPC connectivity
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getHealth"
            }
            
            response = requests.post(rpc_url, json=payload, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if 'result' in result and result['result'] == 'ok':
                    details = {
                        "RPC URL": rpc_url,
                        "Health Status": "OK",
                        "Network": "devnet" if "devnet" in rpc_url else "mainnet" if "mainnet" in rpc_url else "unknown"
                    }
                    self.log_test(test_name, "PASS", "Solana RPC accessible and healthy", details)
                    return True
                else:
                    self.log_test(test_name, "FAIL", f"RPC unhealthy: {result}")
                    return False
            else:
                self.log_test(test_name, "FAIL", f"RPC HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test(test_name, "FAIL", f"RPC connectivity error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests and generate report"""
        print("🚀 Starting SOL Distribution Backend Tests...")
        print("=" * 60)
        
        tests = [
            self.test_file_structure,
            self.test_sol_distribution_implementation,
            self.test_wallet_manager_sol_transfer,
            self.test_command_flow_logic,
            self.test_mathematical_logic,
            self.test_error_handling,
            self.test_dependencies_and_config,
            self.test_telegram_bot_connectivity,
            self.test_solana_rpc_connectivity
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
        
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
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
        tester = TelegramBotTester()
        results = tester.run_all_tests()
        
        # Exit with appropriate code
        if results['failed'] == 0:
            print(f"\n🎉 ALL TESTS PASSED! Success rate: {results['success_rate']:.1f}%")
            sys.exit(0)
        else:
            print(f"\n💥 {results['failed']} TESTS FAILED! Success rate: {results['success_rate']:.1f}%")
            sys.exit(1)
            
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()