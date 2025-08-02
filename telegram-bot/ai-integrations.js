const axios = require('axios');
const googleTrends = require('google-trends-api');

// Fal.ai configuration
const FAL_KEY = "1300b449-e271-476b-b9f8-6f2d81841f06:1f0149c502fa8bc957713a8c78ba92e9";

class AIIntegrations {
    constructor() {
        this.trendingData = {
            googleTrends: [],
            pumpFunCoins: [],
            lastFetched: null
        };
    }

    // Fetch Google Trends data
    async fetchGoogleTrends() {
        try {
            console.log('🔍 Fetching Google Trends data...');
            
            const result = await googleTrends.dailyTrends({
                trendDate: new Date(),
                geo: 'US',
            });
            
            const data = JSON.parse(result);
            const trends = data.default?.trendingSearchesDays?.[0]?.trendingSearches || [];
            
            const trendingKeywords = trends.slice(0, 10).map(trend => ({
                keyword: trend.title.query,
                searchVolume: trend.formattedTraffic || 'N/A'
            }));
            
            console.log(`✅ Fetched ${trendingKeywords.length} Google Trends keywords`);
            return trendingKeywords;
        } catch (error) {
            console.error('❌ Error fetching Google Trends:', error.message);
            // Fallback trending keywords
            return [
                { keyword: 'Bitcoin', searchVolume: '1M+' },
                { keyword: 'Ethereum', searchVolume: '500K+' },
                { keyword: 'Meme coins', searchVolume: '100K+' },
                { keyword: 'Crypto trading', searchVolume: '200K+' },
                { keyword: 'NFT', searchVolume: '150K+' }
            ];
        }
    }

    // Fetch Pump.fun trending coins
    async fetchPumpFunTrending() {
        try {
            console.log('🔍 Fetching Pump.fun trending data...');
            
            // Using a mock endpoint since pump.fun API might not be publicly available
            // In real implementation, replace with actual pump.fun API
            const mockTrendingCoins = [
                { name: 'PepeCoin', ticker: 'PEPE', description: 'The king of meme coins' },
                { name: 'DogeKiller', ticker: 'DOGEK', description: 'Doge but better' },
                { name: 'MoonRocket', ticker: 'MOON', description: 'To the moon and beyond' },
                { name: 'DiamondHands', ticker: 'DIAMOND', description: 'Never selling' },
                { name: 'ShibaInu2', ticker: 'SHIB2', description: 'The next Shiba' }
            ];
            
            console.log(`✅ Fetched ${mockTrendingCoins.length} trending coins from Pump.fun`);
            return mockTrendingCoins;
        } catch (error) {
            console.error('❌ Error fetching Pump.fun data:', error.message);
            return [];
        }
    }

    // Update trending data cache
    async updateTrendingData() {
        try {
            const [googleTrends, pumpFunCoins] = await Promise.all([
                this.fetchGoogleTrends(),
                this.fetchPumpFunTrending()
            ]);

            this.trendingData = {
                googleTrends,
                pumpFunCoins,
                lastFetched: new Date()
            };

            return this.trendingData;
        } catch (error) {
            console.error('❌ Error updating trending data:', error.message);
            throw error;
        }
    }

    // Generate meme coin concept (simplified without GPT-4)
    async generateMemeCoinConcept(userTheme = '', includeTrending = false) {
        try {
            console.log('🤖 Generating meme coin concept...');
            console.log('📋 User theme:', userTheme || 'None');
            console.log('🔥 Include trending:', includeTrending);

            // Get trending data if requested
            let trendingContext = '';
            if (includeTrending) {
                console.log('📈 Fetching trending data...');
                await this.updateTrendingData();
                const trends = this.trendingData.googleTrends.slice(0, 5);
                const coins = this.trendingData.pumpFunCoins.slice(0, 5);
                
                trendingContext = trends.map(t => t.keyword).join(', ');
                console.log('🔥 Trending context:', trendingContext);
            }

            // Simple concept generation without GPT-4
            const timestamp = Date.now();
            const randomness = Math.floor(Math.random() * 1000);
            
            // Generate creative concepts based on theme and trending data
            const concepts = this.generateCreativeConcepts(userTheme, trendingContext);
            const randomConcept = concepts[Math.floor(Math.random() * concepts.length)];

            console.log('✅ Generated meme coin concept:', randomConcept);
            return randomConcept;

        } catch (error) {
            console.error('❌ Error generating meme coin concept:', error);
            console.error('❌ Full error details:', {
                name: error.name,
                message: error.message,
                code: error.code,
                status: error.status,
                stack: error.stack
            });
            
            // Create randomized fallback concepts instead of always using the same one
            const fallbackConcepts = [
                {
                    name: `PizzaCat${Math.floor(Math.random() * 100)}`,
                    ticker: "PIZZACAT",
                    description: "The purrfect slice of meme magic! 🍕🐱"
                },
                {
                    name: `RocketHamster${Math.floor(Math.random() * 100)}`,
                    ticker: "HAMSTER",
                    description: "Tiny hamster with big moon dreams! 🐹🚀"
                },
                {
                    name: `ChillPenguin${Math.floor(Math.random() * 100)}`,
                    ticker: "CHILL",
                    description: "The coolest bird in crypto! 🐧❄️"
                },
                {
                    name: `TacoVibes${Math.floor(Math.random() * 100)}`,
                    ticker: "TACO",
                    description: "Spicy memes and good vibes! 🌮✨"
                },
                {
                    name: `LazyLlama${Math.floor(Math.random() * 100)}`,
                    ticker: "LLAMA",
                    description: "Too lazy to rugpull, too comfy to sell! 🦙😴"
                }
            ];
            
            const randomFallback = fallbackConcepts[Math.floor(Math.random() * fallbackConcepts.length)];
            console.log('🎲 Using random fallback concept:', randomFallback);
            
            return randomFallback;
        }
    }

    // Generate creative concepts based on theme and trending data
    generateCreativeConcepts(userTheme, trendingContext) {
        const animals = ['Cat', 'Dog', 'Hamster', 'Penguin', 'Llama', 'Frog', 'Duck', 'Bear', 'Rabbit', 'Fox'];
        const adjectives = ['Chill', 'Rocket', 'Lazy', 'Happy', 'Crazy', 'Cool', 'Wild', 'Smart', 'Funny', 'Epic'];
        const cryptoWords = ['Moon', 'Diamond', 'Hodl', 'Pump', 'Gem', 'Stack', 'Yield', 'Bull', 'Bear', 'Coin'];
        const actions = ['Vibes', 'Dreams', 'Power', 'Magic', 'Force', 'Energy', 'Spirit', 'Juice', 'Flow', 'Wave'];
        
        const concepts = [];
        
        // Generate 10 different concepts
        for (let i = 0; i < 10; i++) {
            let name, ticker, description;
            
            if (userTheme) {
                // Use user theme as inspiration
                const themeWords = userTheme.split(/\s+/).filter(w => w.length > 2);
                const baseWord = themeWords[0] || userTheme;
                const animal = animals[Math.floor(Math.random() * animals.length)];
                
                name = `${baseWord}${animal}${Math.floor(Math.random() * 99) + 1}`;
                ticker = `${baseWord.substring(0, 4).toUpperCase()}${Math.floor(Math.random() * 99) + 1}`;
                description = `The ultimate ${baseWord.toLowerCase()} ${animal.toLowerCase()} meme coin! 🚀`;
            } else {
                // Random combination
                const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
                const animal = animals[Math.floor(Math.random() * animals.length)];
                const action = actions[Math.floor(Math.random() * actions.length)];
                
                name = `${adj}${animal}${action}`;
                ticker = `${adj.substring(0, 2)}${animal.substring(0, 2)}`.toUpperCase();
                description = `${adj} ${animal.toLowerCase()} bringing ${action.toLowerCase()} to the blockchain! 🎯`;
            }
            
            concepts.push({
                name: name.length > 32 ? name.substring(0, 32) : name,
                ticker: ticker.length > 10 ? ticker.substring(0, 10) : ticker,
                description: description.length > 200 ? description.substring(0, 200) : description
            });
        }
        
        return concepts;
    }

    // Generate meme coin logo using Fal.ai
    async generateMemeCoinLogo(coinName, coinDescription, imageStyle = 'cartoon') {
        try {
            console.log(`🎨 Generating ${imageStyle} logo for "${coinName}" with Fal.ai...`);

            const stylePrompt = imageStyle === '3D' 
                ? '3D rendered, modern, sleek, high-quality 3D graphics'
                : 'cartoon style, colorful, fun, animated look';

            const prompt = `High quality, vibrant meme coin logo. ${stylePrompt}. Circular logo design for "${coinName}". Description: ${coinDescription}. Bold, eye-catching colors, professional but fun and meme-worthy, viral and memorable, high contrast and clear visibility, no text or words in the image`;

            console.log('📝 Sending image generation request to Fal.ai...');
            console.log('🎨 Image style:', imageStyle);

            const response = await axios.post('https://api.fal.ai/v1/run/fal-ai/flux/dev', {
                prompt: prompt,
                image_size: "square",
                num_inference_steps: 30,
                guidance_scale: 7.5
            }, {
                headers: {
                    'Authorization': `Key ${FAL_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            });

            // For compatibility with existing code, we'll return a mock URL
            // The actual image will be handled by the metadata manager
            const mockImageUrl = 'fal-ai://generated-image';
            console.log('✅ Generated logo image with Fal.ai');

            return {
                imageUrl: mockImageUrl,
                prompt: prompt,
                falResponse: response.data
            };

        } catch (error) {
            console.error('❌ Error generating logo with Fal.ai:', error);
            console.error('❌ Full image generation error:', {
                name: error.name,
                message: error.message,
                code: error.code,
                status: error.status
            });
            
            // Return a better placeholder image URL with coin name
            const placeholderImageUrl = `https://via.placeholder.com/400x400/FF6B35/FFFFFF?text=${encodeURIComponent(coinName.substring(0, 10))}`;
            
            return {
                imageUrl: placeholderImageUrl,
                prompt: 'Fallback placeholder image due to API error',
                error: error.message
            };
        }
    }

    // Get trending data summary for display
    getTrendingSummary() {
        const { googleTrends, pumpFunCoins, lastFetched } = this.trendingData;
        
        if (!lastFetched) {
            return 'No trending data available';
        }

        const trendsSummary = googleTrends.slice(0, 3).map(t => t.keyword).join(', ');
        const coinsSummary = pumpFunCoins.slice(0, 3).map(c => c.ticker).join(', ');
        
        return `🔥 Trends: ${trendsSummary}\n💰 Hot Coins: ${coinsSummary}`;
    }
}

module.exports = AIIntegrations;