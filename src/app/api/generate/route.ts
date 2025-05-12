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

const getGeminiCode = async (prompt: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent(
    `Return ONLY valid Manim Python code (no prose) for:\n${prompt}`
  );
  const text = result.response.text();
  const match = text.match(/```(?:python)?\n([\s\S]*?)```/) || [];
  return match[1]?.trim() || text.trim();
};

export async function POST(req: NextRequest) {

  const { prompt, cleanAll } = await req.json();
  const baseDir = path.join(process.cwd(), 'public', 'temp');

  /* ── create directory for each request ── */
  const id       = uuidv4();
  const jobDir = path.join(baseDir, id);
  const pyCacheDir = path.join(jobDir, '__pycache__')
  const mediaDir = path.join(jobDir, 'media');

  try {

    /* ──  cleanup button  ── */
    if (cleanAll) {
      await fs.rm(baseDir, { recursive: true, force: true });
      return NextResponse.json({ message: 'Temporary files cleaned' });
    }
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    await fs.mkdir(mediaDir, { recursive: true });

    /* ── generate code ── */
    const sceneName = 'GeneratedScene';
    const code = await getGeminiCode(prompt);

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

    return NextResponse.json({
      code,
      videoPath: `/temp/${id}/video.mp4`,
      codePath: `/temp/${id}/scene.py`,
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