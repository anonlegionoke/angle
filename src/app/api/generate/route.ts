import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenerativeAI } from '@google/generative-ai';

const execCommand = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(error);
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
      resolve(stdout);
    });
  });
};

const initGeminiAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenerativeAI(apiKey);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateManimCode = async (prompt: string): Promise<string> => {
  const genAI = initGeminiAI();
  const models = [
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-pro"
  ];
  
  let lastError: Error | null = null;
  let retryCount = 0;
  const maxRetries = 3;
  
  for (const modelName of models) {
    retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        console.log(`Trying model: ${modelName}, attempt: ${retryCount + 1}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const manimPrompt = `
        Create Manim Python code for the following animation: ${prompt}
        
        The code should:
        1. Import the necessary Manim libraries
        2. Create a Scene class with a construct method
        3. Include clear comments explaining the animation steps
        4. Only include Python code that works with Manim
        
        Return ONLY the Python code with no additional text.
        `;
        
        const result = await model.generateContent(manimPrompt);
        const response = await result.response;
        const text = response.text();
        
        const codeMatch = text.match(/```python\n([\s\S]*?)```/) || 
                          text.match(/```\n([\s\S]*?)```/) ||
                          text.match(/```([\s\S]*?)```/);
        
        return codeMatch ? codeMatch[1].trim() : text.trim();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Error with model ${modelName}, attempt ${retryCount + 1}:`, lastError.message);
        
        const isQuotaError = lastError.message.includes('429') || 
                             lastError.message.includes('Too Many Requests') || 
                             lastError.message.includes('quota');
        
        if (isQuotaError) {
          if (retryCount < maxRetries - 1) {
            const backoffTime = Math.pow(2, retryCount) * 3000;
            console.log(`Quota exceeded. Retrying in ${backoffTime/1000}s...`);
            await sleep(backoffTime);
          }
        } else {
          await sleep(1000);
        }
        
        retryCount++;
      }
    }
    
          console.log(`All retries failed for model ${modelName}, trying next model...`);
  }
  
  console.error('All models and retries failed');
  throw lastError || new Error('Failed to generate Manim code after exhausting all models and retries');
};

const cleanupTempDir = async () => {
  try {
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    
    try {
      await fs.access(tempDir);
    } catch (error) {
      return;
    }
    
    const entries = await fs.readdir(tempDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(tempDir, entry.name);
      
      if (entry.isDirectory()) {
        if (entry.name === 'nonvideo') {
          try {
            const nonvidFiles = await fs.readdir(path.join(tempDir, 'nonvideo'));
            for (const file of nonvidFiles) {
              await fs.unlink(path.join(tempDir, 'nonvideo', file));
            }
            console.log('Cleaned nonvideo directory');
          } catch (e) {
          }
        } else {
          await fs.rm(entryPath, { recursive: true, force: true });
        }
      } else if (entry.isFile() && entry.name.startsWith('manim_')) {
        await fs.unlink(entryPath);
      }
    }
    
    const nonvidDir = path.join(tempDir, 'nonvideo');
    await fs.mkdir(nonvidDir, { recursive: true });
    
    console.log('Temporary files cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up temp directory:', error);
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, cleanAll } = body;
    
    if (cleanAll) {
      await cleanupTempDir();
      return NextResponse.json({ message: 'All temporary files cleaned up' });
    }
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'No prompt provided' },
        { status: 400 }
      );
    }

    await cleanupTempDir();

    if (prompt === "Transform a square to a circle") {
      const manimCode = `from manim import *

class SquareToCircle(Scene):
    def construct(self):
        # Create a square
        square = Square()
        square.set_fill(BLUE, opacity=0.5)

        # Create a circle
        circle = Circle()
        circle.set_fill(GREEN, opacity=0.5)

        # Display the square
        self.play(Create(square))
        self.wait(1)

        # Transform square to circle
        self.play(Transform(square, circle))
        self.wait(1)`;

      const id = uuidv4();
      const tempDir = path.join(process.cwd(), 'public', 'temp');
      const pythonFilePath = path.join(tempDir, `manim_${id}.py`);
      
      try {
        await fs.mkdir(tempDir, { recursive: true });
        
        await fs.writeFile(pythonFilePath, manimCode);
        
        const outputDir = path.join(tempDir, id);
        await fs.mkdir(outputDir, { recursive: true });
        
        await execCommand(`cd ${tempDir} && manim -ql manim_${id}.py SquareToCircle -o ${id}`);
        
        console.log('Checking output directory contents...');
        const outputFiles = await fs.readdir(outputDir, { withFileTypes: true });
        console.log('Files in output directory:', outputFiles.map(f => f.name));
        
        const mediaDir = path.join(tempDir, 'media', 'videos', `manim_${id}`, '480p15');
        let videoFullPath;
        let videoRelativePath;
        
        try {
          const expectedVideoPath = path.join(outputDir, 'SquareToCircle.mp4');
          await fs.access(expectedVideoPath);
          videoFullPath = expectedVideoPath;
          videoRelativePath = `/temp/${id}/SquareToCircle.mp4`;
        } catch (error) {
          try {
            const manimDefaultPath = path.join(mediaDir, `${id}.mp4`);
            await fs.access(manimDefaultPath);
            videoFullPath = manimDefaultPath;
            videoRelativePath = `/temp/media/videos/manim_${id}/480p15/${id}.mp4`;
          } catch (innerError) {
            try {
              const sceneNamePath = path.join(mediaDir, 'SquareToCircle.mp4');
              await fs.access(sceneNamePath);
              videoFullPath = sceneNamePath;
              videoRelativePath = `/temp/media/videos/manim_${id}/480p15/SquareToCircle.mp4`;
            } catch (finalError) {
              let foundMp4 = false;
              try {
                const allMediaFiles = await fs.readdir(mediaDir, { recursive: true });
                for (const file of allMediaFiles) {
                  if (file.endsWith('.mp4')) {
                    videoFullPath = path.join(mediaDir, file);
                    videoRelativePath = `/temp/media/videos/manim_${id}/480p15/${file}`;
                    foundMp4 = true;
                    break;
                  }
                }
              } catch (searchError) {
              }
              
              if (!foundMp4) {
                throw new Error(`Failed to find generated video file. Manim may have failed to generate the video or used an unexpected output location.`);
              }
            }
          }
        }
        
        if (!videoFullPath || !videoRelativePath) {
          throw new Error('Failed to determine video path');
        }
        
        const customDir = path.join(process.cwd(), 'public', 'temp', 'nonvideo');
        await fs.mkdir(customDir, { recursive: true });
        
        const videoData = await fs.readFile(videoFullPath);
        const customFileName = `video_${id}.nonvid`;
        const customFilePath = path.join(customDir, customFileName);
        await fs.writeFile(customFilePath, videoData);
        
        console.log('Video copied to:', customFilePath);
        
        return NextResponse.json({ 
          result: manimCode,
          videoPath: `/temp/nonvideo/${customFileName}`
        });
      } catch (error: any) {
        console.error('Error generating Manim video:', error);
        return NextResponse.json({ 
          result: manimCode,
          error: `Failed to generate video: ${error.message}`
        });
      }
    } else {
      try {
        const manimCode = await generateManimCode(prompt);
        
        const id = uuidv4();
        const tempDir = path.join(process.cwd(), 'public', 'temp');
        const pythonFilePath = path.join(tempDir, `manim_${id}.py`);
        
        await fs.mkdir(tempDir, { recursive: true });
        await fs.writeFile(pythonFilePath, manimCode);
        
        const outputDir = path.join(tempDir, id);
        await fs.mkdir(outputDir, { recursive: true });
        
        const classNameMatch = manimCode.match(/class\s+(\w+)\s*\(/);
        const className = classNameMatch ? classNameMatch[1] : 'Scene';
        
        await execCommand(`cd ${tempDir} && manim -ql manim_${id}.py ${className} -o ${id}`);
        
        console.log('Checking output directory contents...');
        const outputFiles = await fs.readdir(outputDir, { withFileTypes: true });
        console.log('Files in output directory:', outputFiles.map(f => f.name));
        
        const mediaDir = path.join(tempDir, 'media', 'videos', `manim_${id}`, '480p15');
        let videoFullPath;
        let videoRelativePath;
        
        try {
          const expectedVideoPath = path.join(outputDir, `${className}.mp4`);
          await fs.access(expectedVideoPath);
          videoFullPath = expectedVideoPath;
          videoRelativePath = `/temp/${id}/${className}.mp4`;
        } catch (error) {
          try {
            const manimDefaultPath = path.join(mediaDir, `${id}.mp4`);
            await fs.access(manimDefaultPath);
            videoFullPath = manimDefaultPath;
            videoRelativePath = `/temp/media/videos/manim_${id}/480p15/${id}.mp4`;
          } catch (innerError) {
            try {
              const sceneNamePath = path.join(mediaDir, `${className}.mp4`);
              await fs.access(sceneNamePath);
              videoFullPath = sceneNamePath;
              videoRelativePath = `/temp/media/videos/manim_${id}/480p15/${className}.mp4`;
            } catch (finalError) {
              let foundMp4 = false;
              try {
                const allMediaFiles = await fs.readdir(mediaDir, { recursive: true });
                for (const file of allMediaFiles) {
                  if (file.endsWith('.mp4')) {
                    videoFullPath = path.join(mediaDir, file);
                    videoRelativePath = `/temp/media/videos/manim_${id}/480p15/${file}`;
                    foundMp4 = true;
                    break;
                  }
                }
              } catch (searchError) {
              }
              
              if (!foundMp4) {
                throw new Error(`Failed to find generated video file. Manim may have failed to generate the video or used an unexpected output location.`);
              }
            }
          }
        }
        
        if (!videoFullPath || !videoRelativePath) {
          throw new Error('Failed to determine video path');
        }
        
        const customDir = path.join(process.cwd(), 'public', 'temp', 'nonvideo');
        await fs.mkdir(customDir, { recursive: true });
        
        const videoData = await fs.readFile(videoFullPath);
        const customFileName = `video_${id}.nonvid`;
        const customFilePath = path.join(customDir, customFileName);
        await fs.writeFile(customFilePath, videoData);
        
        console.log('Video copied to:', customFilePath);
        
        return NextResponse.json({ 
          result: manimCode,
          videoPath: `/temp/nonvideo/${customFileName}`
        });
      } catch (error: any) {
        console.error('Error generating animation with Gemini:', error);
        
        console.log('Falling back to backend service...');
        
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          return NextResponse.json(
            { error: error.detail || 'Backend service error' },
            { status: response.status }
          );
        }
        
        const data = await response.json();
        return NextResponse.json(data);
      }
    }
    
  } catch (error) {
    console.error('Error generating animation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
