import { NextRequest, NextResponse } from 'next/server';
import { processPrompt } from '@/lib/manim/promptHandler';
import { generateAnimation } from '@/lib/manim/generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'No prompt provided' },
        { status: 400 }
      );
    }
    
    // Process the prompt to get Manim code
    const manimCode = await processPrompt(prompt);
    
    // In prod, we would generate the animation here
    // For now, we'll just return the code and mock the video paths
    // const { videoPath, thumbnailPath } = await generateAnimation(manimCode);
    
    // Mock response for development
    return NextResponse.json({
      status: 'success',
      videoPath: '/placeholder_video.mp4',
      thumbnailPath: '/placeholder_video.jpg',
      manimCode
    });
    
  } catch (error) {
    console.error('Error generating animation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
