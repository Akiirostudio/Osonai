# osonai - AI Instagram Post Generator

A powerful AI-driven tool that creates fully interactive, Instagram-ready visual posts from a single prompt. Built with OpenAI's DALL-E and GPT models.

## Features

✨ **AI-Powered Generation**
- Generate stunning images using DALL-E 3
- Create engaging captions and hashtags with GPT-4
- Single prompt input for complete post creation

🎨 **Interactive Text Editing**
- Drag and drop text overlays
- Real-time font, color, and size adjustments
- Multiple font templates (Minimal, Bold, Serif, Handwritten, Modern)
- Text alignment and shadow controls

📱 **Instagram-Optimized**
- Multiple aspect ratios (Square 1:1, Portrait 4:5, Landscape 16:9)
- Export as PNG or JPG
- Copy-ready captions with hashtags
- Instagram-compliant dimensions

🔄 **Regeneration Capabilities**
- Regenerate images while preserving text layouts
- Regenerate text content independently
- Upload custom background images

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment**
   - Your OpenAI API key is already configured in `.env`
   - Make sure the `.env` file is never committed to version control

3. **Start the Server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Open Your Browser**
   Navigate to `http://localhost:3000`

## How to Use

1. **Enter Your Prompt**
   - Describe your vision in a single line
   - Example: "A peaceful quote over a forest background with warm colors"

2. **Generate Your Post**
   - Click "Generate Post" and wait for AI magic
   - Both image and text content will be created automatically

3. **Customize Your Design**
   - Drag text elements to reposition them
   - Click text to edit content directly
   - Use the side panel to adjust fonts, colors, and styling
   - Change aspect ratio for different social media formats

4. **Export and Share**
   - Download as high-quality PNG or JPG
   - Copy caption and hashtags for Instagram
   - Images are exported at Instagram-optimized resolutions

## API Endpoints

- `POST /api/generate-image` - Generate image with DALL-E 3
- `POST /api/generate-text` - Generate caption and hashtags with GPT-4
- `POST /api/regenerate-image` - Regenerate image with variations
- `GET /api/health` - Health check endpoint

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express
- **AI**: OpenAI DALL-E 3, GPT-4
- **Styling**: Custom CSS with modern design principles

## Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

## Security

- API keys are stored securely in environment variables
- `.env` file is gitignored to prevent accidental commits
- CORS enabled for secure cross-origin requests

## Development

The application follows a modular architecture:

- `index.html` - Main application interface
- `styles.css` - Complete styling and responsive design
- `app.js` - Frontend application logic and API integration
- `server.js` - Backend API server with OpenAI integration
- `package.json` - Dependencies and scripts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

**osonai** - Where AI meets creativity ✨
