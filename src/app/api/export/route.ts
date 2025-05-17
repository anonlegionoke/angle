import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import http from 'http';

const execPromise = promisify(exec);

function cleanupTempFiles(filePaths: string[]) {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error);
    }
  }
}

export async function POST(request: NextRequest) {
  const tempFiles: string[] = [];
  
  try {
    const { videoPath, videoTrimStart, videoTrimEnd, audioTrimStart, audioTrimEnd } = await request.json();

    if (!videoPath) {
      return NextResponse.json({ error: 'Video path is required' }, { status: 400 });
    }

    const downloadFile = async (url: string, targetPath: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        console.log(`Downloading file from ${url} to ${targetPath}`);
        
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        const client = url.startsWith('https') ? https : http;
        
        const file = fs.createWriteStream(targetPath);
        
        client.get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download file: ${response.statusCode} ${response.statusMessage}`));
            return;
          }
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            console.log(`Download completed: ${targetPath}`);
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(targetPath, () => {});
          reject(err);
        });
      });
    };
    
    let absoluteVideoPath;
    console.log('Received video path:', videoPath);
    
    if (videoPath.startsWith('http')) {
      const tempDir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilename = `temp-${uuidv4()}.mp4`;
      absoluteVideoPath = path.join(tempDir, tempFilename);
      tempFiles.push(absoluteVideoPath);
      
      try {
        await downloadFile(videoPath, absoluteVideoPath);
        console.log('Downloaded video file to:', absoluteVideoPath);
      } catch (error) {
        console.error('Error downloading video file:', error);
        return NextResponse.json({ 
          error: 'Failed to download video file', 
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }
    } else {
      const cleanPath = videoPath.split('?')[0];
      
      if (cleanPath.startsWith('/')) {
        absoluteVideoPath = path.join(process.cwd(), 'public', cleanPath.substring(1));
      } else {
        absoluteVideoPath = path.join(process.cwd(), 'public', cleanPath);
      }
      
      console.log('Resolved absolute path:', absoluteVideoPath);
      
      if (!fs.existsSync(absoluteVideoPath)) {
        const alternativePath = path.join(process.cwd(), videoPath);
        console.log('Trying alternative path:', alternativePath);
        
        if (fs.existsSync(alternativePath)) {
          absoluteVideoPath = alternativePath;
          console.log('Using alternative path:', absoluteVideoPath);
        } else {
          const workerUrl = process.env.WORKER_URL;
          if (workerUrl) {
            const videoUrl = `${workerUrl}${videoPath}`;
            console.log('Trying to download from worker URL:', videoUrl);
            
            const tempDir = path.join(process.cwd(), 'tmp');
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempFilename = `temp-${uuidv4()}.mp4`;
            absoluteVideoPath = path.join(tempDir, tempFilename);
      tempFiles.push(absoluteVideoPath);
            
            try {
              await downloadFile(videoUrl, absoluteVideoPath);
              console.log('Downloaded video file to:', absoluteVideoPath);
            } catch (downloadError) {
              console.error('Error downloading from worker URL:', downloadError);
              return NextResponse.json({ 
                error: 'Video file not found and could not be downloaded', 
                details: {
                  requestedPath: videoPath,
                  resolvedPath: absoluteVideoPath,
                  workerUrl: videoUrl,
                  downloadError: downloadError instanceof Error ? downloadError.message : String(downloadError)
                }
              }, { status: 404 });
            }
          } else {
            return NextResponse.json({ 
              error: 'Video file not found', 
              details: {
                requestedPath: videoPath,
                resolvedPath: absoluteVideoPath,
                alternativePath
              }
            }, { status: 404 });
          }
        }
      }
    }

    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const exportFilename = `export-${uuidv4()}.mp4`;
    const exportPath = path.join(tempDir, exportFilename);
    tempFiles.push(exportPath);

    let ffmpegCommand = `ffmpeg -i "${absoluteVideoPath}" -c:v libx264 -preset medium -crf 22`;

    const hasTrimming = videoTrimStart > 0 || videoTrimEnd < Infinity || audioTrimStart > 0 || audioTrimEnd < Infinity;
    
    if (hasTrimming) {
      if (videoTrimStart > 0 || videoTrimEnd < Infinity) {
        const duration = videoTrimEnd - videoTrimStart;
        ffmpegCommand += ` -ss ${videoTrimStart} -t ${duration}`;
      }
      
      if ((audioTrimStart !== videoTrimStart || audioTrimEnd !== videoTrimEnd) && 
          (audioTrimStart > 0 || audioTrimEnd < Infinity)) {
        const audioStart = audioTrimStart - videoTrimStart;
        const audioDuration = audioTrimEnd - audioTrimStart;
        ffmpegCommand += ` -af "adelay=${Math.max(0, audioStart * 1000)}|${Math.max(0, audioStart * 1000)},apad,atrim=0:${audioDuration}"`;
      }
    }

    ffmpegCommand += ` -y "${exportPath}"`;

    console.log('Executing FFmpeg command:', ffmpegCommand);
    const { stdout, stderr } = await execPromise(ffmpegCommand);
    console.log('FFmpeg stdout:', stdout);
    console.log('FFmpeg stderr:', stderr);

    if (!fs.existsSync(exportPath)) {
      cleanupTempFiles(tempFiles);
      return NextResponse.json({ error: 'Failed to export video' }, { status: 500 });
    }
    
    const fileBuffer = fs.readFileSync(exportPath);
    
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${exportFilename}"`);
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Length', fileBuffer.length.toString());
    
    cleanupTempFiles(tempFiles);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error exporting video:', error);
    cleanupTempFiles(tempFiles);
    return NextResponse.json({ error: 'Failed to export video' }, { status: 500 });
  }
}
