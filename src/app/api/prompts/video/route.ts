import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get('promptId');

    if (!promptId) {
      return NextResponse.json({ error: 'Missing promptId' }, { status: 400 });
    }
      
      const videoPath = `video_${promptId}.mp4`;
      
      console.log('Video path:', videoPath);

    const { data: signedUrl, error: signedUrlError } = await supabase
      .storage
      .from('manim-videos')
      .createSignedUrl(videoPath, 10800); // URL valid for 3 hours

    if (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError);
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json({ url: signedUrl.signedUrl });
  } catch (error) {
    console.error('Error in video endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
