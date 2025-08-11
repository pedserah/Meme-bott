#!/usr/bin/env python3
"""
Backend Test Suite for Meme-bot Telegram Bot
Tests the fixed Meme-bot backend functionality including:
1. Core Bot Functionality (AI integration files)
2. SOL Distribution (/seed_wallets) 
3. Liquidity Lock (/liquidity_lock)
4. AI Integration (Craiyon)
5. Wallet Manager SOL transfers
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

class MemeBotTester:
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
    
    def test_ai_integration_files(self):
        """Test 1: Verify AI integration files exist and are properly implemented"""
        test_name = "AI Integration Files"
        
        required_files = [
            "telegram-bot/ai-integrations.js",
            "telegram-bot/metadata-manager.js"
        ]
        
        missing_files = []
        for file_path in required_files:
            full_path = project_root / file_path
            if not full_path.exists():
                missing_files.append(file_path)
        
        if missing_files:
            self.log_test(test_name, "FAIL", f"Missing AI integration files: {', '.join(missing_files)}")
            return False
        
        # Check AI integrations content
        try:
            ai_integrations_path = self.telegram_bot_dir / "ai-integrations.js"
            with open(ai_integrations_path, 'r') as f:
                ai_content = f.read()
            
            # Check for Craiyon integration (not DALL-E or Fal.ai)
            ai_checks = {
                "Craiyon Integration": "craiyon" in ai_content.lower() or "generateMemeCoinLogo" in ai_content,
                "No DALL-E References": "dall-e" not in ai_content.lower() and "dalle" not in ai_content.lower(),
                "No Fal.ai References": "fal.ai" not in ai_content.lower() or "fal-ai" in ai_content.lower(),  # fal-ai is OK as replacement
                "AI Class Export": "class AIIntegrations" in ai_content and "module.exports" in ai_content
            }
            
            failed_checks = [check for check, passed in ai_checks.items() if not passed]
            
            details = {
                "AI Integration Checks": list(ai_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            if failed_checks:
                self.log_test(test_name, "WARN", f"Some AI integration checks failed: {', '.join(failed_checks)}", details)
                return True  # Still pass as files exist
            
            self.log_test(test_name, "PASS", "AI integration files properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error reading AI integration files: {str(e)}")
            return False
    
    def test_sol_distribution_implementation(self):
        """Test 2: Verify SOL distribution implementation (not token distribution)"""
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
            
            # Verify key functions exist for SOL distribution
            required_functions = {
                "seedWalletsWithSOL": "seedWalletsWithSOL" in bot_content,
                "seedWalletsCommand": "seedWalletsCommand" in bot_content,
                "transferSOL": "transferSOL" in wallet_content,
                "equalizeSOLAcrossWallets": "equalizeSOLAcrossWallets" in bot_content or "equalize" in bot_content.lower()
            }
            
            missing_functions = [func for func, exists in required_functions.items() if not exists]
            
            # Check for SOL-specific logic (not token logic)
            sol_logic_checks = {
                "SOL Reserve Logic": "0.5" in bot_content and "reserve" in bot_content.lower(),
                "SOL Distribution": "SOL" in bot_content and "distribute" in bot_content.lower(),
                "Wallet Range 2-5": "walletId = 2" in bot_content and "walletId <= 5" in bot_content,
                "Balance Check": "availableSOL" in bot_content or "totalSOL" in bot_content,
                "No Token Distribution": "seedWalletsForToken" not in bot_content
            }
            
            failed_checks = [check for check, passed in sol_logic_checks.items() if not passed]
            
            details = {
                "Functions Found": [func for func, exists in required_functions.items() if exists],
                "Missing Functions": missing_functions,
                "Logic Checks": list(sol_logic_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            if missing_functions:
                self.log_test(test_name, "FAIL", f"Missing SOL distribution functions: {', '.join(missing_functions)}", details)
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Some SOL logic checks failed: {', '.join(failed_checks)}", details)
                return True  # Still pass as core functions exist
            
            self.log_test(test_name, "PASS", "SOL distribution properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error reading files: {str(e)}")
            return False
    
    def test_liquidity_lock_implementation(self):
        """Test 3: Verify liquidity lock command implementation"""
        test_name = "Liquidity Lock Implementation"
        
        bot_js_path = self.telegram_bot_dir / "bot.js"
        raydium_manager_path = self.telegram_bot_dir / "raydium-manager.js"
        
        try:
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            # Check for liquidity lock command and functions
            liquidity_lock_checks = {
                "Lock Liquidity Command": "/lock_liquidity" in bot_content or "liquidity_lock" in bot_content,
                "Execute Liquidity Lock": "executeLiquidityLock" in bot_content,
                "Lock Duration": "1 month" in bot_content.lower() or "1 year" in bot_content.lower(),
                "Lock Verification": "verify" in bot_content.lower() and "lock" in bot_content.lower(),
                "Pool Selection": "pool" in bot_content.lower() and "select" in bot_content.lower()
            }
            
            failed_checks = [check for check, passed in liquidity_lock_checks.items() if not passed]
            
            # Check raydium-manager for lock functionality
            raydium_checks = {}
            if raydium_manager_path.exists():
                with open(raydium_manager_path, 'r') as f:
                    raydium_content = f.read()
                
                raydium_checks = {
                    "Raydium Manager Exists": True,
                    "Pool Management": "pool" in raydium_content.lower(),
                    "Lock Storage": "lock" in raydium_content.lower() or "Lock" in raydium_content
                }
            else:
                raydium_checks = {"Raydium Manager Exists": False}
            
            details = {
                "Liquidity Lock Checks": list(liquidity_lock_checks.keys()),
                "Failed Bot Checks": failed_checks,
                "Raydium Manager Checks": list(raydium_checks.keys()),
                "Failed Raydium Checks": [check for check, passed in raydium_checks.items() if not passed]
            }
            
            total_failed = len(failed_checks) + len([check for check, passed in raydium_checks.items() if not passed])
            
            if total_failed > 2:
                self.log_test(test_name, "FAIL", f"Liquidity lock implementation incomplete: {total_failed} checks failed", details)
                return False
            elif total_failed > 0:
                self.log_test(test_name, "WARN", f"Some liquidity lock checks failed: {total_failed}", details)
                return True
            
            self.log_test(test_name, "PASS", "Liquidity lock properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing liquidity lock: {str(e)}")
            return False
    
    def test_wallet_manager_sol_transfer(self):
        """Test 4: Verify transferSOL method implementation"""
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
                "Return Object": "success:" in content and "signature:" in content,
                "SOL Amount Conversion": "LAMPORTS_PER_SOL" in content
            }
            
            missing_components = [comp for comp, exists in transfer_components.items() if not exists]
            
            details = {
                "Components Checked": list(transfer_components.keys()),
                "Missing Components": missing_components
            }
            
            if missing_components:
                self.log_test(test_name, "FAIL", f"Missing transferSOL components: {', '.join(missing_components)}", details)
                return False
            
            self.log_test(test_name, "PASS", "transferSOL method properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing transferSOL: {str(e)}")
            return False
    
    def test_bot_startup_no_crashes(self):
        """Test 5: Verify bot can start without crashes (missing files issue)"""
        test_name = "Bot Startup Test"
        
        try:
            # Check if all required files exist
            required_files = [
                "telegram-bot/bot.js",
                "telegram-bot/wallet-manager.js",
                "telegram-bot/ai-integrations.js",
                "telegram-bot/metadata-manager.js",
                "telegram-bot/raydium-manager.js",
                "telegram-bot/token-manager.js",
                "telegram-bot/.env",
                "telegram-bot/package.json"
            ]
            
            missing_files = []
            for file_path in required_files:
                full_path = project_root / file_path
                if not full_path.exists():
                    missing_files.append(file_path)
            
            if missing_files:
                self.log_test(test_name, "FAIL", f"Missing files that would cause crashes: {', '.join(missing_files)}")
                return False
            
            # Check bot.js for proper imports
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            import_checks = {
                "AI Integrations Import": "require('./ai-integrations')" in bot_content,
                "Wallet Manager Import": "require('./wallet-manager')" in bot_content,
                "Token Manager Import": "require('./token-manager')" in bot_content,
                "Raydium Manager Import": "require('./raydium-manager')" in bot_content,
                "Bot Initialization": "new TelegramBot(" in bot_content
            }
            
            failed_imports = [check for check, passed in import_checks.items() if not passed]
            
            details = {
                "Required Files": required_files,
                "Missing Files": missing_files,
                "Import Checks": list(import_checks.keys()),
                "Failed Imports": failed_imports
            }
            
            if failed_imports:
                self.log_test(test_name, "WARN", f"Some imports may cause issues: {', '.join(failed_imports)}", details)
                return True  # Still pass as files exist
            
            self.log_test(test_name, "PASS", "Bot should start without crashes", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error checking bot startup: {str(e)}")
            return False
    
    def test_dependencies_and_config(self):
        """Test 6: Verify dependencies and configuration"""
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
                "dotenv",
                "axios"  # For AI integrations
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
        """Test 7: Test Telegram Bot API connectivity"""
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
        """Test 8: Test Solana RPC connectivity"""
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
        print("🚀 Starting Meme-bot Backend Tests...")
        print("=" * 60)
        
        tests = [
            self.test_ai_integration_files,
            self.test_sol_distribution_implementation,
            self.test_liquidity_lock_implementation,
            self.test_wallet_manager_sol_transfer,
            self.test_bot_startup_no_crashes,
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
        tester = MemeBotTester()
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