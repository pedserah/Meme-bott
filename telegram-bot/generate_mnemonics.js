const { Keypair } = require('@solana/web3.js');
const crypto = require('crypto');

function generateMnemonic() {
    // Generate 12 random words for the mnemonic
    const words = [];
    const wordList = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
        'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
        'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
        'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
        'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
        'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
        'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
        'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
        'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
        'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest'
    ];
    
    for(let i = 0; i < 12; i++) {
        const randomIndex = crypto.randomInt(0, wordList.length);
        words.push(wordList[randomIndex]);
    }
    
    return words.join(' ');
}

console.log('\nGenerated new secure mnemonics for your wallets:\n');
for(let i = 1; i <= 5; i++) {
    console.log(`WALLET_${i}_MNEMONIC=${generateMnemonic()}`);
}
console.log('\nMake sure to save these somewhere safe and update your .env file!\n');
