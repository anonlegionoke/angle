import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';


export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const projectId = request.nextUrl.searchParams.get('projectId');
    
    const { data: prompts, error } = await supabase
      .from('prompts')
      .select('prompt_id, timestamp, usr_msg, llm_res')
      .eq('project_id', projectId)
      .order('timestamp', { ascending: true });
    
    if (error) {
      console.error('Error fetching prompts:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve prompts', prompts: [] },
        { status: 500 }
      );
    }
    
    const formattedPrompts = prompts.map(prompt => ({
      id: prompt.prompt_id,
      timestamp: prompt.timestamp,
      usrMsg: prompt.usr_msg,
      llmRes: prompt.llm_res
    }));
    
    return NextResponse.json({ prompts: formattedPrompts });
  } catch (error) {
    console.error('Error retrieving prompts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve prompts', prompts: [] },
      { status: 500 }
    );
  }
}
