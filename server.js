const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const multer = require('multer');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Configure multer for file uploads
const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Generate image using DALL-E
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, aspectRatio = '1:1' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Determine image size based on aspect ratio
        let size = '1024x1024'; // Default square
        if (aspectRatio === '4:5') {
            size = '1024x1280'; // Portrait
        } else if (aspectRatio === '16:9') {
            size = '1792x1024'; // Landscape
        }

        // Enhance the prompt for better image generation
        const enhancedPrompt = `${prompt}, high quality, professional photography, Instagram-worthy, vibrant colors, excellent composition`;

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: enhancedPrompt,
            n: 1,
            size: size,
            quality: "standard",
            style: "vivid"
        });

        res.json({
            success: true,
            imageUrl: response.data[0].url,
            revisedPrompt: response.data[0].revised_prompt
        });

    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).json({ 
            error: 'Failed to generate image',
            details: error.message 
        });
    }
});

// Generate text content using GPT
app.post('/api/generate-text', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const systemPrompt = `You are a creative Instagram content generator. Based on the user's prompt, generate engaging Instagram post content.

Return your response as a JSON object with the following structure:
{
    "title": "A catchy title (3-6 words max, bold and engaging)",
    "subtitle": "An optional subtitle (up to 10 words, complements the title)",
    "caption": "Instagram caption (2-3 sentences max, engaging and authentic with relevant emojis)",
    "hashtags": ["array", "of", "15-25", "relevant", "hashtags", "without", "spaces"]
}

Make sure the content is:
- Engaging and Instagram-optimized
- Relevant to the prompt
- Uses appropriate emojis
- Has trending and niche hashtags
- Feels authentic and not overly promotional`;

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Generate Instagram content for: ${prompt}` }
            ],
            temperature: 0.8,
            max_tokens: 1000
        });

        const content = response.choices[0].message.content;
        
        try {
            const parsedContent = JSON.parse(content);
            res.json({
                success: true,
                ...parsedContent
            });
        } catch (parseError) {
            // Fallback if JSON parsing fails
            res.json({
                success: true,
                title: "Inspiration",
                subtitle: "Find your moment",
                caption: "Embrace the beauty of everyday moments. ✨",
                hashtags: ["#inspiration", "#motivation", "#lifestyle", "#mindfulness", "#beauty", "#moments", "#life", "#positivity", "#wellness", "#selfcare", "#mindset", "#growth", "#peace", "#joy", "#gratitude"]
            });
        }

    } catch (error) {
        console.error('Error generating text:', error);
        res.status(500).json({ 
            error: 'Failed to generate text content',
            details: error.message 
        });
    }
});

// Regenerate image with same prompt
app.post('/api/regenerate-image', async (req, res) => {
    try {
        const { prompt, aspectRatio = '1:1' } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Add variation to the prompt for different results
        const variations = [
            'different angle',
            'alternative composition',
            'different lighting',
            'unique perspective',
            'creative interpretation'
        ];
        
        const randomVariation = variations[Math.floor(Math.random() * variations.length)];
        const variedPrompt = `${prompt}, ${randomVariation}`;

        // Determine image size based on aspect ratio
        let size = '1024x1024';
        if (aspectRatio === '4:5') {
            size = '1024x1280';
        } else if (aspectRatio === '16:9') {
            size = '1792x1024';
        }

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: variedPrompt,
            n: 1,
            size: size,
            quality: "standard",
            style: "vivid"
        });

        res.json({
            success: true,
            imageUrl: response.data[0].url,
            revisedPrompt: response.data[0].revised_prompt
        });

    } catch (error) {
        console.error('Error regenerating image:', error);
        res.status(500).json({ 
            error: 'Failed to regenerate image',
            details: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'osonai',
        timestamp: new Date().toISOString() 
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
    }
    
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`✨ osonai server running on http://localhost:${PORT}`);
    console.log(`🚀 Ready to generate amazing Instagram posts!`);
});

module.exports = app;
