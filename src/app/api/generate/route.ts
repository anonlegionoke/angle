import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';
import { generateProjectId } from '@/components/LandingPage';

async function getProjectChatLog(projectId: string) {
  try {
    const supabase = await createClient();
    
    const { data: promptsData, error: promptsError } = await supabase
      .from('prompts')
      .select('usr_msg, llm_res')
      .eq('project_id', projectId)
      .order('timestamp', { ascending: false });
  
    if (promptsError) {
      console.error('Error fetching prompts:', promptsError);
      return { prompts: [], code: '' };
    }
    
    if (!promptsData || promptsData.length === 0) {
      return { prompts: [], code: '' };
    }
    
    const prompts = promptsData.map(prompt => prompt.usr_msg);
    
    let latestCode = '';
    for (const prompt of promptsData) {
      try {
        const llmResponse = prompt.llm_res ?? prompt.llm_res;
        if (llmResponse && llmResponse.code) {
          latestCode = llmResponse.code;
          break;
        }
      } catch (e) {
        console.error('Error parsing llm_res JSON:', e);
      }
    }
    
    return { prompts, code: latestCode };
  } catch (error) {
    console.error('Error fetching project chat log:', error);
    return { prompts: [], code: '' };
  }
}

const sharedPromptRequirements = `Important rules:
1. Keep the same scene name (GeneratedScene)
2. Maintain the overall structure but add or modify animations as needed
3. Keep all previous animations
4. Add new animations that implement the new request
5. Remove previous animation elements if user asks
6. Return ONLY the complete, updated code - no explanations or markdown
7. First display title if exists and if there is contents inside it, move the title up and
   display explanations below
8. Make sure no elements overlap one another
9. Whenever there is an example showing, make sure it takes center stage in the scene
10. Make sure the returning python code is type-safe and high quality with no errors
11. When explaining an example, move the main title to top left, make the size smaller so that the newer titles won't overlap it
12. First displaying text will be in the center when center is free, when new text comes, if there is space, display both in single line but with space justificaton between other wise dispaly below it
13. Make sure the code is following strict type rules of manim

Return ONLY the complete, updated Python code that fulfills these requirements.`;

const newAnimationPrompt = (userPrompt: string) => `You are a Python Manim animation expert. Your task is to create a Manim animation.

NEW REQUEST: "${userPrompt}"

${sharedPromptRequirements}

Return the complete Python code:`;

const extendAnimationPrompt = (userPrompt: string, prevPrompts: string[], currentCode: string) => `You are a Python Manim animation expert. Your task is to modify existing code to implement a new animation request.

Previous sequence of prompts: "${prevPrompts.join('" -> "')}"

Current Python Manim code:
\`\`\`python
${currentCode}
\`\`\`

NEW REQUEST: "${userPrompt}"

Continue the animation by modifying the existing code to implement this new request. The modified code should build upon the previous animation, not start from scratch.

${sharedPromptRequirements}

Return the complete, modified Python code:`;

const getGeminiCode = async (prompt: string, projectId?: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.0-flash' });

  let fullPrompt: string;
  
  if (projectId) {
    const context = await getProjectChatLog(projectId);
    if (context.prompts.length > 0 && context.code) {
      fullPrompt = extendAnimationPrompt(prompt, context.prompts, context.code);
    } else {
      fullPrompt = newAnimationPrompt(prompt);
    }
  } else {
    fullPrompt = newAnimationPrompt(prompt);
  }

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  const match = text.match(/```(?:python)?\n([\s\S]*?)```/) || [];
  return match[1]?.trim() || text.trim();
};

export async function POST(req: NextRequest) {
  const { prompt, projectId } = await req.json();
  
  const supabase = await createClient();
  let currentProjectId = projectId;
  
  if (!projectId && prompt) {
    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        project_id: generateProjectId()  
      })
      .select()
      .single();
    
    if (projectError) {
      console.error('Error creating new project:', projectError);
      return NextResponse.json({ error: 'Failed to create new project' }, { status: 500 });
    }
    
    currentProjectId = newProject.project_id;
  }

  /* ── create unique ID for request ── */
  const id = uuidv4();

  try {
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    /* ── generate code ── */
    const sceneName = 'GeneratedScene';
    const code = await getGeminiCode(prompt, currentProjectId);

    /* ── render using worker API ── */
    const workerUrl = process.env.WORKER_URL;
    if (!workerUrl) throw new Error('WORKER_URL not set in environment variables');

    const renderResponse = await fetch(`${workerUrl}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        scene_name: sceneName,
        job_id: id,
        project_id: currentProjectId || 'default-project'
      })
    });

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      throw new Error(`Worker render failed: ${renderResponse.status} ${errorText}`);
    }

    const renderResult = await renderResponse.json();
    const videoUrl = renderResult.video_url;

    if (!videoUrl) {
      throw new Error('Worker did not return a video URL');
    }

    const relativeVideoPath = videoUrl;

    const llmResponse = JSON.stringify({
      code,
      videoPath: relativeVideoPath
    });

    const { error: promptInsertError } = await supabase
      .from('prompts')
      .insert({
        prompt_id: id,
        project_id: currentProjectId,
        usr_msg: prompt,
        llm_res: llmResponse,
      });

    if (promptInsertError) {
      console.error('Error inserting prompt:', promptInsertError);
    }

    let hasContext = false;
    let promptHistory: string[] = [];
    
    if (currentProjectId) {
      const chatLog = await getProjectChatLog(currentProjectId);
      hasContext = chatLog.prompts.length > 0;
      promptHistory = chatLog.prompts;
    }
    
    return NextResponse.json({
      code,
      videoPath: relativeVideoPath,
      hasContext,
      promptHistory,
      projectId: currentProjectId
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}