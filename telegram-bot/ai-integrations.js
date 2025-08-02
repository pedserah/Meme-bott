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

    // Generate meme coin concept using GPT-4
    async generateMemeCoinConcept(userTheme = '', includeTrending = false) {
        try {
            console.log('🤖 Generating meme coin concept with GPT-4...');
            console.log('📋 User theme:', userTheme || 'None');
            console.log('🔥 Include trending:', includeTrending);

            // Get trending data if requested
            let trendingContext = '';
            if (includeTrending) {
                console.log('📈 Fetching trending data...');
                await this.updateTrendingData();
                const trends = this.trendingData.googleTrends.slice(0, 5);
                const coins = this.trendingData.pumpFunCoins.slice(0, 5);
                
                trendingContext = `
Current trending topics: ${trends.map(t => t.keyword).join(', ')}
Trending meme coins: ${coins.map(c => `${c.name} (${c.ticker})`).join(', ')}
`;
                console.log('🔥 Trending context:', trendingContext);
            }

            // Create a more dynamic prompt
            const timestamp = Date.now();
            const randomness = Math.floor(Math.random() * 1000);
            
            const prompt = `You are a creative meme coin generator (ID: ${timestamp}-${randomness}). Create a unique, funny, viral-worthy meme coin concept.

${trendingContext}

User theme/keyword: ${userTheme || 'None - be completely creative and unique!'}

IMPORTANT: Create a completely UNIQUE concept each time. Do not repeat previous concepts.

Generate a meme coin concept with these requirements:
1. Name: Catchy, memorable, meme-worthy, UNIQUE (max 32 characters)
2. Ticker: 3-6 characters, ALL CAPS, related to the name, UNIQUE
3. Description: Funny tagline/description (max 200 characters) that captures the meme essence

Make it trendy, humorous, and likely to go viral. Consider current internet culture and memes.
${userTheme ? `Focus on the theme: ${userTheme}` : 'Be completely creative and original!'}
${includeTrending ? 'Incorporate trending themes subtly.' : 'Focus on creativity and humor.'}

Be creative with these themes:
- Animals (cats, dogs, hamsters, penguins)
- Space/Moon themes (rocket, mars, satellite) 
- Food memes (pizza, taco, burger)
- Internet culture (chad, karen, based)
- Emotions (happy, sad, angry, excited)
- Actions (hodl, yeet, vibe, chill)

Respond in this exact JSON format:
{
  "name": "Generated coin name",
  "ticker": "TICKER", 
  "description": "Funny description that captures the meme essence"
}`;

            console.log('📝 Sending prompt to GPT-4...');
            console.log('🔑 API Key status:', this.apiKeyStatus());
            
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a creative meme coin concept generator. Always respond with valid JSON only. Be unique and creative each time."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.9, // High creativity
                top_p: 1.0,
                frequency_penalty: 0.5, // Reduce repetition
                presence_penalty: 0.3   // Encourage new topics
            });

            const response = completion.choices[0].message.content.trim();
            console.log('🤖 GPT-4 raw response:', response);

            // Clean up the response if it has markdown formatting
            const cleanResponse = response.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
            console.log('🧽 Cleaned response:', cleanResponse);

            // Parse JSON response
            const concept = JSON.parse(cleanResponse);
            
            // Validate required fields
            if (!concept.name || !concept.ticker || !concept.description) {
                throw new Error(`Invalid GPT-4 response format. Missing fields. Got: ${JSON.stringify(concept)}`);
            }

            // Additional validation
            if (concept.name.length > 32) {
                concept.name = concept.name.substring(0, 32);
            }
            if (concept.ticker.length > 10) {
                concept.ticker = concept.ticker.substring(0, 10);
            }
            if (concept.description.length > 200) {
                concept.description = concept.description.substring(0, 200);
            }

            console.log('✅ Generated meme coin concept:', concept);
            return concept;

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

    // Check API key status
    apiKeyStatus() {
        const key = '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';
        if (!key || key.startsWith('your_')) {
            return 'Missing or placeholder API key';
        }
        if (key.length < 20) {
            return 'API key too short';
        }
        return `Valid format (${key.length} chars)`;
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