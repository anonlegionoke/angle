import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const promptId = searchParams.get('promptId');

  if (!promptId) {
    return NextResponse.json({ error: 'Missing promptId' }, { status: 400 });
  }

  try {
    const { data: files, error: filesError } = await supabase.storage.from('manim-frames').list(promptId);
    
    if (filesError) {
      console.error('Error fetching files:', filesError);
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 });
    }

    const signedUrls: string[] = [];

    for (const file of files || []) {
      const { data: signedUrl, error: urlError } = await supabase.storage.from('manim-frames').createSignedUrls([promptId + '/' + file.name], 10800); // 3 hours
      
      if (urlError) {
        console.error('Error generating signed URLs:', urlError);
        return NextResponse.json({ error: 'Failed to generate signed URLs' }, { status: 500 });
      }

      if (signedUrl && signedUrl[0]) {
        signedUrls.push(signedUrl[0].signedUrl);
      }
    }

    return NextResponse.json({ frames: signedUrls }, { status: 200 });
 
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}