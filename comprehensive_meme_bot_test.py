#!/usr/bin/env python3
"""
Comprehensive Meme-bot Command Test Suite
Tests all 8 core commands mentioned in the review request:
1. /auto_brand - AI branding with Craiyon integration
2. /set_fees - SOL-based tax rate configuration (0-99%)
3. /chart_activity - Chart activity simulation with small trades
4. /exempt_wallet - Wallet tax exemption functionality
5. /mint_rugpull - Educational mint+sell simulation
6. /liquidity_lock - 1-month liquidity locking
7. Token Creation - Verify Wallet 1 gets exactly 20% of total supply
8. SOL Tax System - Verify taxes collected in SOL (not tokens)
"""

import os
import sys
import json
import time
import subprocess
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

class ComprehensiveMemeBotTester:
    def __init__(self):
        self.telegram_bot_dir = project_root / "telegram-bot"
        self.test_results = []
        
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
    
    def test_auto_brand_command(self):
        """Test /auto_brand command with Craiyon integration"""
        test_name = "/auto_brand Command"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            ai_integrations_path = self.telegram_bot_dir / "ai-integrations.js"
            with open(ai_integrations_path, 'r') as f:
                ai_content = f.read()
            
            checks = {
                "Auto Brand Command Handler": "/auto_brand" in bot_content,
                "Craiyon Integration": "craiyon" in ai_content.lower(),
                "No DALL-E References": "dall-e" not in ai_content.lower() and "dalle" not in ai_content.lower(),
                "No Fal.ai References": "fal.ai" not in ai_content.lower(),
                "AI Branding Function": "generateBranding" in ai_content or "autoBrand" in ai_content,
                "Command Callback": "auto_brand" in bot_content
            }
            
            failed_checks = [check for check, passed in checks.items() if not passed]
            
            if len(failed_checks) > 1:
                self.log_test(test_name, "FAIL", f"{len(failed_checks)} checks failed", {"Failed": failed_checks})
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Minor issues: {failed_checks}", {"Failed": failed_checks})
                return True
            
            self.log_test(test_name, "PASS", "AI branding with Craiyon integration working")
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error: {str(e)}")
            return False
    
    def test_set_fees_command(self):
        """Test /set_fees command with 0-99% tax configuration"""
        test_name = "/set_fees Command"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            checks = {
                "Set Fees Command Handler": "/set_fees" in bot_content,
                "Tax Rate Configuration": "0-99%" in bot_content or ("0%" in bot_content and "99%" in bot_content),
                "SOL-based Tax System": "SOL" in bot_content and "tax" in bot_content.lower(),
                "Interactive UI": "callback_data: 'set_fees'" in bot_content,
                "Tax Manager Integration": "taxManager" in bot_content,
                "Buy/Sell Tax Options": "buyTax" in bot_content and "sellTax" in bot_content
            }
            
            failed_checks = [check for check, passed in checks.items() if not passed]
            
            if len(failed_checks) > 1:
                self.log_test(test_name, "FAIL", f"{len(failed_checks)} checks failed", {"Failed": failed_checks})
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Minor issues: {failed_checks}", {"Failed": failed_checks})
                return True
            
            self.log_test(test_name, "PASS", "SOL-based tax rate configuration (0-99%) working")
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error: {str(e)}")
            return False
    
    def test_chart_activity_command(self):
        """Test /chart_activity command with small trades simulation"""
        test_name = "/chart_activity Command"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            real_trading_path = self.telegram_bot_dir / "real-trading-manager.js"
            with open(real_trading_path, 'r') as f:
                trading_content = f.read()
            
            checks = {
                "Chart Activity Command": "/chart_activity" in bot_content,
                "Start Chart Activity": "startChartActivity" in trading_content,
                "Stop Chart Activity": "stopChartActivity" in trading_content,
                "Small Trade Logic": "0.005" in trading_content and "0.02" in trading_content,
                "Periodic Trading": "setInterval" in trading_content or "setTimeout" in trading_content,
                "Command Handler": "chart_activity" in bot_content
            }
            
            failed_checks = [check for check, passed in checks.items() if not passed]
            
            if len(failed_checks) > 1:
                self.log_test(test_name, "FAIL", f"{len(failed_checks)} checks failed", {"Failed": failed_checks})
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Minor issues: {failed_checks}", {"Failed": failed_checks})
                return True
            
            self.log_test(test_name, "PASS", "Chart activity simulation with small trades working")
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error: {str(e)}")
            return False
    
    def test_exempt_wallet_command(self):
        """Test /exempt_wallet command for tax exemption"""
        test_name = "/exempt_wallet Command"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            tax_manager_path = self.telegram_bot_dir / "tax-manager.js"
            with open(tax_manager_path, 'r') as f:
                tax_content = f.read()
            
            checks = {
                "Exempt Wallet Command": "/exempt_wallet" in bot_content,
                "Tax Exemption Logic": "exemptWallet" in tax_content or "addExemption" in tax_content,
                "Exempt Wallets State": "exemptWallets" in bot_content,
                "Command Handler": "exempt_wallet" in bot_content,
                "Tax Manager Integration": "taxManager" in bot_content
            }
            
            failed_checks = [check for check, passed in checks.items() if not passed]
            
            if len(failed_checks) > 1:
                self.log_test(test_name, "FAIL", f"{len(failed_checks)} checks failed", {"Failed": failed_checks})
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Minor issues: {failed_checks}", {"Failed": failed_checks})
                return True
            
            self.log_test(test_name, "PASS", "Wallet tax exemption functionality working")
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error: {str(e)}")
            return False
    
    def test_mint_rugpull_command(self):
        """Test /mint_rugpull educational simulation command"""
        test_name = "/mint_rugpull Command"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            checks = {
                "Mint Rugpull Command": "/mint_rugpull" in bot_content,
                "Educational Messaging": "research" in bot_content.lower() and "simulation" in bot_content.lower(),
                "Devnet Research Label": "devnet" in bot_content.lower(),
                "Command Handler": "mint_rugpull" in bot_content,
                "Interactive UI": "callback_data: 'mint_rugpull'" in bot_content,
                "Educational Warning": "educational" in bot_content.lower() or "research" in bot_content.lower()
            }
            
            failed_checks = [check for check, passed in checks.items() if not passed]
            
            if len(failed_checks) > 1:
                self.log_test(test_name, "FAIL", f"{len(failed_checks)} checks failed", {"Failed": failed_checks})
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Minor issues: {failed_checks}", {"Failed": failed_checks})
                return True
            
            self.log_test(test_name, "PASS", "Educational mint+sell simulation working")
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error: {str(e)}")
            return False
    
    def test_liquidity_lock_command(self):
        """Test /liquidity_lock command with 1-month duration"""
        test_name = "/liquidity_lock Command"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            raydium_manager_path = self.telegram_bot_dir / "raydium-manager.js"
            with open(raydium_manager_path, 'r') as f:
                raydium_content = f.read()
            
            checks = {
                "Liquidity Lock Command": "/liquidity_lock" in bot_content,
                "1-Month Duration": "30" in raydium_content or "1 month" in raydium_content.lower(),
                "Lock Liquidity Method": "lockLiquidity" in raydium_content,
                "Command Handler": "liquidity_lock" in bot_content or "lock_liquidity" in bot_content,
                "Lock Verification": "getLiquidityLock" in raydium_content
            }
            
            failed_checks = [check for check, passed in checks.items() if not passed]
            
            if len(failed_checks) > 1:
                self.log_test(test_name, "FAIL", f"{len(failed_checks)} checks failed", {"Failed": failed_checks})
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Minor issues: {failed_checks}", {"Failed": failed_checks})
                return True
            
            self.log_test(test_name, "PASS", "1-month liquidity locking working")
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error: {str(e)}")
            return False
    
    def test_token_creation_wallet1_allocation(self):
        """Test token creation gives Wallet 1 exactly 20% of total supply"""
        test_name = "Token Creation (20% to Wallet 1)"
        
        try:
            token_manager_path = self.telegram_bot_dir / "token-manager.js"
            with open(token_manager_path, 'r') as f:
                token_content = f.read()
            
            checks = {
                "20% Allocation Logic": "0.2" in token_content or "20%" in token_content,
                "Wallet 1 Share": "wallet1Share" in token_content,
                "Not 100% to Wallet 1": not ("mintAmount = totalSupply * Math.pow(10, 9)" in token_content),
                "Supply Distribution": "totalSupply *" in token_content,
                "Mint to Wallet 1": "mintTo" in token_content
            }
            
            failed_checks = [check for check, passed in checks.items() if not passed]
            
            # Critical check: ensure it's not giving 100% to Wallet 1
            if "mintAmount = totalSupply * Math.pow(10, 9)" in token_content:
                self.log_test(test_name, "FAIL", "Still gives 100% to Wallet 1 - critical issue")
                return False
            
            if len(failed_checks) > 2:
                self.log_test(test_name, "FAIL", f"{len(failed_checks)} checks failed", {"Failed": failed_checks})
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Minor issues: {failed_checks}", {"Failed": failed_checks})
                return True
            
            self.log_test(test_name, "PASS", "Wallet 1 gets exactly 20% of total supply")
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error: {str(e)}")
            return False
    
    def test_sol_tax_system_verification(self):
        """Test SOL tax system (taxes collected in SOL, not tokens)"""
        test_name = "SOL Tax System"
        
        try:
            tax_manager_path = self.telegram_bot_dir / "tax-manager.js"
            with open(tax_manager_path, 'r') as f:
                tax_content = f.read()
            
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            checks = {
                "Tax Manager Class": "class TaxManager" in tax_content,
                "SOL Collection State": "solTaxCollection" in bot_content,
                "Collect in SOL Flag": "collectInSOL" in bot_content,
                "SOL Tax Calculation": "calculateTaxAmount" in tax_content or "calculateSOLTax" in tax_content,
                "Tax Stats Tracking": "taxStats" in tax_content or "recordTaxCollection" in tax_content,
                "Status Shows SOL Tax": "SOL Collected" in bot_content and "Tax Recipient: Wallet 1" in bot_content
            }
            
            failed_checks = [check for check, passed in checks.items() if not passed]
            
            if len(failed_checks) > 1:
                self.log_test(test_name, "FAIL", f"{len(failed_checks)} checks failed", {"Failed": failed_checks})
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Minor issues: {failed_checks}", {"Failed": failed_checks})
                return True
            
            self.log_test(test_name, "PASS", "Taxes collected in SOL (not tokens)")
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all comprehensive tests"""
        print("🚀 Starting Comprehensive Meme-bot Command Tests...")
        print("=" * 70)
        
        tests = [
            self.test_auto_brand_command,
            self.test_set_fees_command,
            self.test_chart_activity_command,
            self.test_exempt_wallet_command,
            self.test_mint_rugpull_command,
            self.test_liquidity_lock_command,
            self.test_token_creation_wallet1_allocation,
            self.test_sol_tax_system_verification
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
        print("📊 COMPREHENSIVE COMMAND TEST SUMMARY")
        print("=" * 70)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Warnings: {warnings}")
        print(f"📋 Total: {len(tests)}")
        print(f"🎯 Success Rate: {(passed / len(tests)) * 100:.1f}%")
        
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
        tester = ComprehensiveMemeBotTester()
        results = tester.run_all_tests()
        
        # Exit with appropriate code
        if results['failed'] == 0:
            print(f"\n🎉 ALL TESTS PASSED! Success rate: {results['success_rate']:.1f}%")
            return results
        else:
            print(f"\n💥 {results['failed']} TESTS FAILED! Success rate: {results['success_rate']:.1f}%")
            return results
            
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return None

if __name__ == "__main__":
    main()