import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';
import { generateProjectId } from '@/components/LandingPage';
import { getCodeUrl } from '@/lib/projectUtils';

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
4. Add new animations without removing old ones
5. Remove previous animation elements ONLY IF user asks
6. Return ONLY the complete, updated code - no explanations or markdown
7. First display title if exists and if there is contents inside it, move the title up and
   display explanations below
8. Make sure NO OVERLAP BETWEEN TEXTS
9. Whenever there is an example showing, make sure it takes center stage in the scene
10. Make sure the returning python code is type-safe and high quality with no errors
11. When explaining an example, remove the first main title
12. First displaying text will be in the center when center is free, when new text comes, if there is space, display both in single line but with space justificaton between other wise dispaly below it
13. Make sure the code is following strict type rules of manim
14. Return complete ERROR FREE code
15. PYTHON CODE SHOULD CLEAN, AND HIGH QUALITY, with no errors
16. USE LATEST MANIM CODE PRACTICES
17. Use MANIM VECTORS and MANIM NATIVE functions

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

READ current Python Manim code, to understand where we stand, and improve this current code, and DON'T start code from scratch

NEW REQUEST: "${userPrompt}"

Continue the animation by modifying the existing code to implement this new request. The modified code should build upon the previous animation, not start from scratch.

${sharedPromptRequirements}

Return the complete, modified Python code:`;

const getGeminiCode = async (prompt: string, projectId: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL!;
  if (!apiKey || !geminiModel) throw new Error('GEMINI_API_KEY not set or invalid GEMINI_MODEL');
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: geminiModel });

  let fullPrompt: string;
  
  const context = await getProjectChatLog(projectId);
  if (context?.prompts?.length > 0 && context?.code) {
    fullPrompt = extendAnimationPrompt(prompt, context.prompts, context.code);
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
    const code = await getGeminiCode(prompt, currentProjectId);
  
    const codeUrl = await getCodeUrl({code, promptId:id, projectId:currentProjectId, supabase});

    /* ── render using worker API ── */
    const workerUrl = process.env.WORKER_URL;
    if (!workerUrl) throw new Error('WORKER_URL not set in environment variables');

    let videoUrl: string;

    const triggerGithubActions = await fetch(`${workerUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAT_TOKEN}`,
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          code_url: codeUrl,
          prompt_id: id,
          project_id: currentProjectId 
        }
      })
    })
    
    if (triggerGithubActions.status === 204) {
      console.log('Triggered GitHub Actions successfully');
      videoUrl = 'pending';
    } else {
      const errorText = await triggerGithubActions.text();
      throw new Error(`Worker render failed: ${triggerGithubActions.status} ${errorText}`);
    }

    if (videoUrl === 'pending') {
      console.log("Video is being renderd, please wait...");
    }

    const { error: promptInsertError } = await supabase
      .from('prompts')
      .insert({
        prompt_id: id,
        project_id: currentProjectId,
        usr_msg: prompt,
        llm_res: JSON.stringify({ code }),
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
      videoPath: videoUrl,
      hasContext,
      promptHistory,
      projectId: currentProjectId,
      promptId: id
    });
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}