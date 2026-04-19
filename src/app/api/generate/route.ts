import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';
import { generateProjectId } from '@/components/LandingPage';
import { getCodeUrl } from '@/lib/projectUtils';
import { MANIM_FEW_SHOT_EXAMPLES, validateManimCode, formatValidationErrors } from '@/lib/manimReference';

/**
 * Safely extracts the code string from llm_res, which may be:
 * - A JSON object like { code: "..." } (if column is jsonb and stored correctly)
 * - A JSON string like '{"code":"..."}' (if column is text or was double-stringified)
 */
function extractCodeFromLlmRes(llmRes: unknown): string {
  if (!llmRes) return '';
  
  // Already a parsed object with .code
  if (typeof llmRes === 'object' && llmRes !== null && 'code' in llmRes) {
    return (llmRes as { code: string }).code || '';
  }
  
  // It's a string — try to parse it as JSON
  if (typeof llmRes === 'string') {
    try {
      const parsed = JSON.parse(llmRes);
      if (parsed && typeof parsed === 'object' && 'code' in parsed) {
        return parsed.code || '';
      }
    } catch {
      // Not valid JSON, return empty
    }
  }
  
  return '';
}

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
    
    // Find the latest code from the most recent prompt that has one
    let latestCode = '';
    for (const prompt of promptsData) {
      const code = extractCodeFromLlmRes(prompt.llm_res);
      if (code) {
        latestCode = code;
        break;
      }
    }

    console.log(`[context] projectId=${projectId}, prompts=${prompts.length}, hasCode=${!!latestCode}, codeLength=${latestCode.length}`);
    
    return { prompts, code: latestCode };
  } catch (error) {
    console.error('Error fetching project chat log:', error);
    return { prompts: [], code: '' };
  }
}

const codeStyleRules = `
Rules for writing Manim code:
1. Scene class MUST be named GeneratedScene
2. Return ONLY Python code — no explanations, no markdown fences
3. ALWAYS use keyword arguments for constructors (e.g., Circle(radius=1.5), NOT Circle(1.5))
4. Make sure NO OVERLAP BETWEEN TEXTS — use .next_to() with buff spacing
5. Center content when there is space available
6. Use .set_color() after creation when unsure if constructor accepts color=
7. Code class: use code_string=, never code=. Use .scale() for sizing, never font_size=`;

const newAnimationPrompt = (userPrompt: string) => `You generate Manim Community v0.19+ Python code.
Study the examples below and follow the EXACT same patterns. Do NOT guess constructor arguments.

${MANIM_FEW_SHOT_EXAMPLES}

${codeStyleRules}

REQUEST: "${userPrompt}"

Return ONLY the complete Python code.`;

const extendAnimationPrompt = (userPrompt: string, prevPrompts: string[], currentCode: string) => `You MODIFY existing Manim code. You must KEEP ALL existing code and ADD to it.

Reference examples for correct syntax (do NOT copy these scenes, only use for syntax reference):
${MANIM_FEW_SHOT_EXAMPLES}

${codeStyleRules}

═══════════════════════════════════════════════
THE CODE BELOW IS THE CURRENT ANIMATION. YOU MUST KEEP IT ALL.
═══════════════════════════════════════════════

Previous user prompts that built this code: "${prevPrompts.join('" -> "')}"

Current working code that you MUST preserve:
\`\`\`python
${currentCode}
\`\`\`

═══════════════════════════════════════════════
NEW REQUEST: "${userPrompt}"
═══════════════════════════════════════════════

IMPORTANT INSTRUCTIONS:
- You MUST keep ALL existing code from the construct() method above
- ADD the new request ON TOP of the existing animations
- Do NOT delete or replace any existing self.play() calls
- Do NOT start from scratch — the current code is the foundation
- Return the FULL updated Python code with both old and new content

Return ONLY the complete Python code:`;

/** Max number of self-correction attempts when validation finds issues */
const MAX_FIX_ATTEMPTS = 2;

function extractCode(text: string): string {
  const match = text.match(/```(?:python)?\n([\s\S]*?)```/) || [];
  return match[1]?.trim() || text.trim();
}

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

  // ── initial generation ──
  let result = await model.generateContent(fullPrompt);
  let code = extractCode(result.response.text());

  // ── validate & self-correct loop ──
  for (let attempt = 0; attempt < MAX_FIX_ATTEMPTS; attempt++) {
    const errors = validateManimCode(code);
    if (errors.length === 0) break; // code is clean

    console.warn(`[manim-validator] Attempt ${attempt + 1}: Found ${errors.length} issue(s), requesting fix...`);
    
    const fixPrompt = `Fix this Manim code. It has errors that will crash the renderer.

\`\`\`python
${code}
\`\`\`

${formatValidationErrors(errors)}

IMPORTANT: ALWAYS use keyword arguments for geometry constructors.
✅ Circle(radius=1.5) ❌ Circle(1.5)
✅ Rectangle(width=4, height=2) ❌ Rectangle(4, 2)
✅ AnnularSector(inner_radius=0.5, outer_radius=1.5, angle=PI/3)

Fix ALL issues. Return ONLY the corrected Python code, no explanations.`;

    result = await model.generateContent(fixPrompt);
    code = extractCode(result.response.text());
  }

  // Log any remaining issues as warnings (don't block)
  const remainingErrors = validateManimCode(code);
  if (remainingErrors.length > 0) {
    console.warn(`[manim-validator] ${remainingErrors.length} issue(s) remain after ${MAX_FIX_ATTEMPTS} fix attempts:`,
      remainingErrors.map(e => e.message));
  }

  return code;
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
        llm_res: { code },
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