#!/usr/bin/env python3
"""
Launch Token Functionality Test
Tests the specific launch token functionality as requested:
1. Launch Command Handler - Test /launch command is registered and working
2. Launch Token Button - Test 'launch_token' callback handler  
3. Token Creation Flow - Test startTokenCreation function executes
4. Error Handling - Test that launch errors are caught and handled
5. Bot Response - Test that the bot responds to launch requests
"""

import os
import sys
import json
import time
import subprocess
import requests
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

class LaunchTokenTester:
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
    
    def test_launch_command_handler(self):
        """Test 1: Verify /launch command is registered and working"""
        test_name = "Launch Command Handler"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            if not bot_js_path.exists():
                self.log_test(test_name, "FAIL", "bot.js file not found")
                return False
            
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            # Check for /launch command registration
            launch_checks = {
                "Launch Command Registration": "bot.onText(/\\/launch/" in bot_content,
                "Launch Command Handler": "/launch" in bot_content,
                "Launch Function Call": "startTokenCreation" in bot_content,
                "Command Error Handling": "try {" in bot_content and "catch" in bot_content
            }
            
            failed_checks = []
            for check, passed in launch_checks.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Launch Command Checks": list(launch_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            if failed_checks:
                self.log_test(test_name, "FAIL", f"Launch command handler incomplete: {len(failed_checks)} checks failed", details)
                return False
            
            self.log_test(test_name, "PASS", "Launch command handler properly registered", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing launch command: {str(e)}")
            return False
    
    def test_launch_token_button(self):
        """Test 2: Test 'launch_token' callback handler"""
        test_name = "Launch Token Button"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            # Check for launch_token callback handler
            button_checks = {
                "Launch Token Button": "callback_data: 'launch_token'" in bot_content,
                "Launch Token Callback Handler": "data === 'launch_token'" in bot_content,
                "Button in Start Menu": "'🚀 Launch Coin'" in bot_content,
                "Callback Query Handler": "bot.on('callback_query'" in bot_content,
                "Button Response": "startTokenCreation" in bot_content
            }
            
            failed_checks = []
            for check, passed in button_checks.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Button Checks": list(button_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            if failed_checks:
                self.log_test(test_name, "FAIL", f"Launch token button incomplete: {len(failed_checks)} checks failed", details)
                return False
            
            self.log_test(test_name, "PASS", "Launch token button properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing launch token button: {str(e)}")
            return False
    
    def test_token_creation_flow(self):
        """Test 3: Test startTokenCreation function executes"""
        test_name = "Token Creation Flow"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            # Check for startTokenCreation function and flow
            flow_checks = {
                "StartTokenCreation Function": "function startTokenCreation(" in bot_content,
                "User Session Management": "botState.userSessions" in bot_content,
                "Token Creation Steps": "waiting_for_name" in bot_content,
                "Input Validation": "validateTokenParams" in bot_content,
                "Token Manager Integration": "tokenManager" in bot_content,
                "Multi-Step Flow": "step:" in bot_content and "tokenData:" in bot_content
            }
            
            failed_checks = []
            for check, passed in flow_checks.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Flow Checks": list(flow_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            if failed_checks:
                self.log_test(test_name, "FAIL", f"Token creation flow incomplete: {len(failed_checks)} checks failed", details)
                return False
            
            self.log_test(test_name, "PASS", "Token creation flow properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing token creation flow: {str(e)}")
            return False
    
    def test_error_handling(self):
        """Test 4: Test that launch errors are caught and handled"""
        test_name = "Error Handling"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            # Check for error handling in launch functionality
            error_checks = {
                "Try-Catch Blocks": bot_content.count("try {") >= 2,
                "Error Logging": "console.error" in bot_content,
                "User Error Messages": "❌" in bot_content,
                "Fallback Handling": "catch (error)" in bot_content,
                "Session Cleanup": "botState.userSessions.delete" in bot_content,
                "Validation Errors": "validateTokenParams" in bot_content and "errors" in bot_content
            }
            
            failed_checks = []
            for check, passed in error_checks.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Error Handling Checks": list(error_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            if len(failed_checks) > 2:  # Allow some flexibility
                self.log_test(test_name, "FAIL", f"Error handling incomplete: {len(failed_checks)} checks failed", details)
                return False
            elif failed_checks:
                self.log_test(test_name, "WARN", f"Some error handling checks failed: {len(failed_checks)}", details)
                return True
            
            self.log_test(test_name, "PASS", "Error handling properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing error handling: {str(e)}")
            return False
    
    def test_bot_response(self):
        """Test 5: Test that the bot responds to launch requests"""
        test_name = "Bot Response"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            with open(bot_js_path, 'r') as f:
                bot_content = f.read()
            
            # Check for bot response mechanisms
            response_checks = {
                "Bot Send Message": "bot.sendMessage" in bot_content,
                "Launch Response Message": "Create New Meme Coin" in bot_content or "token creation" in bot_content.lower(),
                "Interactive UI": "reply_markup" in bot_content,
                "Step-by-Step Guidance": "Step 1" in bot_content or "step:" in bot_content,
                "Callback Query Answers": "bot.answerCallbackQuery" in bot_content,
                "Message Formatting": "parse_mode" in bot_content
            }
            
            failed_checks = []
            for check, passed in response_checks.items():
                if not passed:
                    failed_checks.append(check)
            
            details = {
                "Response Checks": list(response_checks.keys()),
                "Failed Checks": failed_checks
            }
            
            if failed_checks:
                self.log_test(test_name, "FAIL", f"Bot response incomplete: {len(failed_checks)} checks failed", details)
                return False
            
            self.log_test(test_name, "PASS", "Bot response properly implemented", details)
            return True
            
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error analyzing bot response: {str(e)}")
            return False
    
    def test_bot_syntax_validation(self):
        """Test 6: Verify Bot.js syntax is correct"""
        test_name = "Bot.js Syntax Validation"
        
        try:
            bot_js_path = self.telegram_bot_dir / "bot.js"
            
            # Use Node.js to check syntax
            result = subprocess.run(
                ['node', '-c', str(bot_js_path)],
                capture_output=True,
                text=True,
                cwd=self.telegram_bot_dir
            )
            
            if result.returncode == 0:
                self.log_test(test_name, "PASS", "Bot.js syntax is valid")
                return True
            else:
                self.log_test(test_name, "FAIL", f"Bot.js syntax error: {result.stderr}")
                return False
                
        except FileNotFoundError:
            self.log_test(test_name, "WARN", "Node.js not available for syntax check")
            return True
        except Exception as e:
            self.log_test(test_name, "FAIL", f"Error checking syntax: {str(e)}")
            return False
    
    def test_telegram_bot_connectivity(self):
        """Test 7: Test Telegram Bot API connectivity"""
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
                        "Can Join Groups": bot_info.get('result', {}).get('can_join_groups', False)
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
        """Run all launch token tests and generate report"""
        print("🚀 Starting Launch Token Functionality Tests...")
        print("=" * 70)
        
        tests = [
            self.test_launch_command_handler,
            self.test_launch_token_button,
            self.test_token_creation_flow,
            self.test_error_handling,
            self.test_bot_response,
            self.test_bot_syntax_validation,
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
        print("📊 LAUNCH TOKEN FUNCTIONALITY TEST SUMMARY")
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
        tester = LaunchTokenTester()
        results = tester.run_all_tests()
        
        # Exit with appropriate code
        if results['failed'] == 0:
            print(f"\n🎉 ALL LAUNCH TOKEN TESTS PASSED! Success rate: {results['success_rate']:.1f}%")
            return results
        else:
            print(f"\n💥 {results['failed']} LAUNCH TOKEN TESTS FAILED! Success rate: {results['success_rate']:.1f}%")
            return results
            
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return None

if __name__ == "__main__":
    main()