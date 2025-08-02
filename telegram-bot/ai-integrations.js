const OpenAI = require('openai');
const axios = require('axios');
const googleTrends = require('google-trends-api');

// OpenAI client initialization
const openai = new OpenAI({
    apiKey: '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'
});

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

    // Generate meme coin concept using GPT-4
    async generateMemeCoinConcept(userTheme = '', includeTrending = false) {
        try {
            console.log('🤖 Generating meme coin concept with GPT-4...');

            // Get trending data if requested
            let trendingContext = '';
            if (includeTrending) {
                await this.updateTrendingData();
                const trends = this.trendingData.googleTrends.slice(0, 5);
                const coins = this.trendingData.pumpFunCoins.slice(0, 5);
                
                trendingContext = `
Current trending topics: ${trends.map(t => t.keyword).join(', ')}
Trending meme coins: ${coins.map(c => `${c.name} (${c.ticker})`).join(', ')}
`;
            }

            const prompt = `You are a creative meme coin generator. Create a funny, viral-worthy meme coin concept.

${trendingContext}

User theme/keyword: ${userTheme || 'None - be creative!'}

Generate a meme coin concept with these requirements:
1. Name: Catchy, memorable, meme-worthy (max 32 characters)
2. Ticker: 3-6 characters, ALL CAPS, related to the name
3. Description: Funny tagline/description (max 200 characters) that captures the meme essence

Make it trendy, humorous, and likely to go viral. Consider current internet culture and memes.
If trending data is provided, subtly incorporate those themes.

Respond in this exact JSON format:
{
  "name": "Generated coin name",
  "ticker": "TICKER",
  "description": "Funny description that captures the meme essence"
}`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a creative meme coin concept generator. Always respond with valid JSON only."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.9
            });

            const response = completion.choices[0].message.content;
            console.log('🤖 GPT-4 response:', response);

            // Parse JSON response
            const concept = JSON.parse(response);
            
            // Validate required fields
            if (!concept.name || !concept.ticker || !concept.description) {
                throw new Error('Invalid GPT-4 response format');
            }

            console.log('✅ Generated meme coin concept:', concept);
            return concept;

        } catch (error) {
            console.error('❌ Error generating meme coin concept:', error.message);
            
            // Fallback concept
            return {
                name: "MoonDoge",
                ticker: "MOONDOGE", 
                description: "When Doge meets the moon - the ultimate space meme coin! 🚀🐕"
            };
        }
    }

    // Generate meme coin logo using DALL·E 3
    async generateMemeCoinLogo(coinName, coinDescription, imageStyle = 'cartoon') {
        try {
            console.log(`🎨 Generating ${imageStyle} logo for ${coinName} with DALL·E 3...`);

            const stylePrompt = imageStyle === '3D' 
                ? '3D rendered, modern, sleek, high-quality 3D graphics'
                : 'cartoon style, colorful, fun, animated look';

            const prompt = `Create a meme coin logo for "${coinName}". 
Description: ${coinDescription}

Style: ${stylePrompt}
Requirements:
- Circular logo design perfect for a cryptocurrency
- Bold, eye-catching colors
- Professional but fun and meme-worthy
- Include subtle cryptocurrency/blockchain elements
- Make it viral and memorable
- High contrast and clear visibility
- No text or words in the image`;

            const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                quality: "standard",
                style: "vivid"
            });

            const imageUrl = response.data[0].url;
            console.log('✅ Generated logo image:', imageUrl);

            return {
                imageUrl,
                prompt: prompt
            };

        } catch (error) {
            console.error('❌ Error generating logo with DALL·E 3:', error.message);
            
            // Return a placeholder image URL
            return {
                imageUrl: 'https://via.placeholder.com/400x400/FF6B35/FFFFFF?text=MEME+COIN',
                prompt: 'Fallback placeholder image',
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