/**
 * Manim Generator Utility
 * 
 * This module provides functions for generating Manim animations
 * based on user prompts and code.
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

interface ManimGenerationOptions {
  quality?: 'low_quality' | 'medium_quality' | 'high_quality';
  resolution?: '480p' | '720p' | '1080p';
}

interface ManimGenerationResult {
  videoPath: string;
  thumbnailPath: string;
  manimCode: string;
}

/**
 * Generate a Manim animation from code
 */
export async function generateAnimation(
  manimCode: string, 
  options: ManimGenerationOptions = {}
): Promise<ManimGenerationResult> {
  const {
    quality = 'medium_quality',
    resolution = '1080p'
  } = options;

  // Create a unique ID for this animation
  const animationId = uuidv4();
  
  // Create a temporary directory for the Manim script
  const tempDir = path.join(os.tmpdir(), `manim-${animationId}`);
  fs.mkdirSync(tempDir, { recursive: true });
  
  const scriptPath = path.join(tempDir, `animation_${animationId}.py`);
  
  try {
    // Write the Manim code to a temporary file
    fs.writeFileSync(scriptPath, manimCode);
    
    // Extract the scene class name from the code
    const sceneClass = extractSceneClass(manimCode);
    if (!sceneClass) {
      throw new Error("Could not determine scene class name from the generated code");
    }
    
    // Set up the media directory
    const mediaDir = path.join(process.cwd(), 'public', 'media');
    fs.mkdirSync(mediaDir, { recursive: true });
    
    // Build the Manim command
    const command = [
      "manim",
      scriptPath,
      sceneClass,
      `--${quality}`,
      `--media_dir=${mediaDir}`,
      `--output_file=animation_${animationId}`
    ].join(' ');
    
    // Execute Manim
    const result = await executeCommand(command);
    
    // Get the paths to the generated files
    const videoDir = path.join(mediaDir, 'videos', `animation_${animationId}`);
    const videoFiles = fs.readdirSync(videoDir)
      .filter(file => file.endsWith('.mp4'))
      .map(file => path.join(videoDir, file));
    
    if (videoFiles.length === 0) {
      throw new Error("No video file was generated");
    }
    
    // Get the video file path relative to the public directory
    const videoPath = path.relative(
      path.join(process.cwd(), 'public'),
      videoFiles[0]
    );
    
    // Generate a thumbnail from the video
    const thumbnailPath = await generateThumbnail(
      videoFiles[0], 
      mediaDir, 
      animationId
    );
    
    return {
      videoPath: `/${videoPath.replace(/\\/g, '/')}`,
      thumbnailPath: `/${thumbnailPath.replace(/\\/g, '/')}`,
      manimCode
    };
  } catch (error) {
    console.error(`Error generating animation: ${error}`);
    throw error;
  } finally {
    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error(`Error cleaning up temp directory: ${e}`);
    }
  }
}

/**
 * Extract the scene class name from the Manim code
 */
function extractSceneClass(manimCode: string): string | null {
  const lines = manimCode.split('\n');
  for (const line of lines) {
    if (line.includes('class') && line.includes('Scene')) {
      // Extract class name from line like "class MyScene(Scene):"
      const match = line.match(/class\s+(\w+)\s*\(/);
      if (match && match[1]) {
        return match[1];
      }
    }
  }
  return null;
}

/**
 * Generate a thumbnail image from the video
 */
async function generateThumbnail(
  videoPath: string, 
  mediaDir: string, 
  animationId: string
): Promise<string> {
  // Create thumbnails directory
  const thumbnailsDir = path.join(mediaDir, 'thumbnails');
  fs.mkdirSync(thumbnailsDir, { recursive: true });
  
  // Set thumbnail path
  const thumbnailPath = path.join(thumbnailsDir, `thumbnail_${animationId}.jpg`);
  
  // Use ffmpeg to extract a frame from the middle of the video
  const command = [
    "ffmpeg",
    "-i", videoPath,
    "-ss", "00:00:02",  // 2 seconds into the video
    "-frames:v", "1",
    "-q:v", "2",
    thumbnailPath
  ].join(' ');
  
  await executeCommand(command);
  
  // Return the path relative to the media directory
  return path.relative(
    path.join(process.cwd(), 'public'),
    thumbnailPath
  );
}

/**
 * Execute a shell command and return the result
 */
function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command execution error: ${stderr}`);
        reject(new Error(`Command execution failed: ${stderr}`));
        return;
      }
      resolve(stdout);
    });
  });
}
