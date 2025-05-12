# Angle - Math Animation Generator

This application generates math animations using Manim, inspired by 3Blue1Brown.

## Prerequisites

- Node.js (v18 or higher)
- [Manim Community](https://www.manim.community/) installed on your system
- Python 3.7+

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Install Manim Community:
   ```
   pip install manim
   ```

## Running the Application

```
npm run dev
```

The application will be available at http://localhost:3000

## Features

- Generate math animations using natural language prompts
- Real-time code display and video preview
- API integration with Manim Community for rendering

## Development

The application consists of:
- Next.js frontend
- API route that processes prompts and generates animations
- Manim integration for creating math visualizations

For custom prompts, modify the `/src/app/api/generate/route.ts` file.

## Acknowledgements

- [Manim](https://github.com/ManimCommunity/manim) - The Mathematical Animation Engine
- [Next.js](https://nextjs.org/) - The React Framework for the Web
- [FastAPI](https://fastapi.tiangolo.com/) - Modern, fast web framework for building APIs with Python

## License

MIT

## New Feature: Gemini AI Integration for Manim Code Generation

We've added Google's Gemini AI to generate Manim animations from text prompts. This allows for dynamic creation of various mathematical and visual animations without writing code manually.

### Setup Instructions

1. Get a Gemini API key from [Google AI Studio](https://ai.google.dev/)
2. Create a `.env.local` file in the project root with the following content:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
3. Install the required package:
   ```
   npm install @google/generative-ai
   ```

### Usage

Simply enter a prompt describing the animation you want to create, and Gemini will generate the appropriate Manim code which will then be executed to create the animation.

Example prompts:
- "Create a 3D rotating cube that changes colors"
- "Show a sine wave forming and then transform into a circle"
- "Animate the Pythagorean theorem visually"

### Fallback System

If the Gemini API fails or is not configured, the system will automatically fall back to the backend service for animation generation.

### API Quota Management

The application implements smart handling of API quota limits:

1. **Model Fallback**: When the primary model (gemini-1.5-pro) reaches its quota limit, the system automatically tries alternative models (gemini-1.5-flash, gemini-pro) in sequence.

2. **Retry Mechanism**: For temporary quota errors, the system implements exponential backoff retry (3s, 6s, 12s) before trying alternative models.

3. **Backend Service Fallback**: If all Gemini API models are unavailable or quota-limited, the system falls back to the original backend service.

This layered approach ensures maximum reliability while optimizing for the best available AI models.
