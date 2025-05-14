import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';

const execCommand = (cmd: string) =>
  new Promise<void>((res, rej) =>
    exec(cmd, (err, out, errOut) => (err ? rej(err) : (errOut && console.warn(errOut), res())))
  );

async function getProjectChatLog(projectId: string) {
  try {
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    const logsDir = path.join(tempDir, projectId, 'logs');
    
    try {
      await fs.access(logsDir);
    } catch (error) {
      return { prompts: [], code: '' };
    }
    
    const files = await fs.readdir(logsDir);
    const logFiles = files.filter(file => file.startsWith('chat-log-') && file.endsWith('.json'));
    
    if (logFiles.length === 0) {
      return { prompts: [], code: '' };
    }
    
    logFiles.sort().reverse();
    
    const latestLogFile = logFiles[0];
    const logFilePath = path.join(logsDir, latestLogFile);
    
    const fileContent = await fs.readFile(logFilePath, 'utf-8');
    const logs: { userMessage: string; llmResponse?: { code?: string } }[] = JSON.parse(fileContent);
    
    if (!logs || logs.length === 0) {
      return { prompts: [], code: '' };
    }
    
    const prompts = logs.map((log: { userMessage: string }) => log.userMessage);
    
    let latestCode = '';
    for (let i = logs.length - 1; i >= 0; i--) {
      const response = logs[i].llmResponse;
      if (response && response.code) {
        latestCode = response.code;
        break;
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
  const { prompt, cleanAll, projectId } = await req.json();
  
  const publicTempDir = path.join(process.cwd(), 'public', 'temp');
  
  let baseDir: string;
  
  if (projectId) {
    baseDir = path.join(publicTempDir, projectId);
    
    try {
      await fs.access(baseDir);
    } catch (err) {
      await fs.mkdir(baseDir, { recursive: true });
    }
  } else {
    baseDir = publicTempDir;
  }

  /* ── create directory for each request ── */
  const id = uuidv4();
  const jobDir = path.join(baseDir, id);
  const pyCacheDir = path.join(jobDir, '__pycache__')
  const mediaDir = path.join(jobDir, 'media');

  try {
    /* ──  cleanup button  ── */
    if (cleanAll) {
      if (projectId) {
        await fs.rm(baseDir, { recursive: true, force: true });
      } else {
        await fs.rm(publicTempDir, { recursive: true, force: true });
      }
      return NextResponse.json({ message: 'Temporary files cleaned' });
    }
    
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    await fs.mkdir(mediaDir, { recursive: true });

    /* ── generate code ── */
    const sceneName = 'GeneratedScene';
    const code = await getGeminiCode(prompt, projectId);

    const pyPath = path.join(jobDir, 'scene.py');
    await fs.writeFile(pyPath, code);

    /* ── render ── */
    await execCommand(
      `manim render --disable_caching --media_dir "${mediaDir}" --output_file final.mp4 "${pyPath}" ${sceneName}`
    );

    /* ── grab output ── */
    const searchDir = path.join(mediaDir, 'videos');
    const allFiles  = await fs.readdir(searchDir, { recursive: true });
    const mp4Rel    = allFiles.find((f) => f.endsWith('.mp4'));
    if (!mp4Rel) throw new Error('Rendered video not found');
    const rendered  = path.join(searchDir, mp4Rel);

    const finalVideoPath = path.join(jobDir, 'video.mp4');
    await fs.copyFile(rendered, finalVideoPath);

    let relativeVideoPath;
    if (projectId) {
      relativeVideoPath = `/temp/${projectId}/${id}/video.mp4`;
    } else {
      relativeVideoPath = `/temp/${id}/video.mp4`;
    }

    let hasContext = false;
    let promptHistory: string[] = [];
    
    if (projectId) {
      const chatLog = await getProjectChatLog(projectId);
      hasContext = chatLog.prompts.length > 0;
      promptHistory = chatLog.prompts;
    }
    
    return NextResponse.json({
      code,
      videoPath: relativeVideoPath,
      codePath: projectId 
        ? `/temp/${projectId}/${id}/scene.py` 
        : `/temp/${id}/scene.py`,
      hasContext,
      promptHistory
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  } finally {
    await Promise.allSettled([
       /* ── delete all temp/cache files ── */
        fs.rm(mediaDir, { recursive: true, force: true }),
        fs.rm(pyCacheDir, { recursive: true, force: true })
    ])
  }
}