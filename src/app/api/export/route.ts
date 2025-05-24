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

    console.log('Received request to export video');

    const { videoPath, videoTrimStart, videoTrimEnd, audioTrimStart, audioTrimEnd, audioClips } = await request.json();
    
    const audioClipFiles: { path: string; startTime: number; duration: number }[] = [];
    
    if (audioClips && Array.isArray(audioClips) && audioClips.length > 0) {
      console.log(`Processing ${audioClips.length} audio clips for export`);
      
      const audioTempDir = path.join(process.cwd(), 'tmp', 'audio');
      if (!fs.existsSync(audioTempDir)) {
        fs.mkdirSync(audioTempDir, { recursive: true });
      }
      
      for (const clip of audioClips) {
        try {
          if (!clip.blobBase64) {
            console.warn(`Audio clip ${clip.id} has no blob data, skipping`);
            continue;
          }
          
          const buffer = Buffer.from(clip.blobBase64, 'base64');
          
          const audioFilePath = path.join(audioTempDir, `${clip.id}.webm`);
          fs.writeFileSync(audioFilePath, buffer);
          tempFiles.push(audioFilePath);
          
          audioClipFiles.push({
            path: audioFilePath,
            startTime: clip.startTime,
            duration: clip.duration
          });
          
          console.log(`Saved audio clip ${clip.id} to ${audioFilePath}`);
        } catch (error) {
          console.error(`Error processing audio clip ${clip.id}:`, error);
        }
      }
    }

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

    let ffmpegCommand = '';
        
    const effectiveVideoTrimStart = typeof videoTrimStart === 'number' && !isNaN(videoTrimStart) ? videoTrimStart : 0;
    const effectiveVideoTrimEnd = typeof videoTrimEnd === 'number' && !isNaN(videoTrimEnd) && videoTrimEnd < Infinity ? videoTrimEnd : 300; 
    
    const trimDuration = effectiveVideoTrimEnd - effectiveVideoTrimStart;
    console.log(`Trimming video from ${effectiveVideoTrimStart}s to ${effectiveVideoTrimEnd}s (duration: ${trimDuration}s)`);
    
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const filterComplexFile = path.join(tmpDir, `filter-${uuidv4()}.txt`);
    tempFiles.push(filterComplexFile);
        
    const tempSegmentPath = path.join(tempDir, `segment-${uuidv4()}.mp4`);
    tempFiles.push(tempSegmentPath);
    
    const extractCommand = `ffmpeg -ss ${Math.max(0, effectiveVideoTrimStart - 0.5)} -i "${absoluteVideoPath}" -ss 0.5 -t ${trimDuration} -c copy "${tempSegmentPath}"`;
    
    console.log('Executing extract command:', extractCommand);
    try {
      const { stdout: extractStdout, stderr: extractStderr } = await execPromise(extractCommand);
      console.log('Extract stdout:', extractStdout);
      console.log('Extract stderr:', extractStderr);
      
      if (!fs.existsSync(tempSegmentPath)) {
        throw new Error('Failed to extract video segment');
      }
      
      console.log(`Successfully extracted segment to ${tempSegmentPath}`);
    } catch (error) {
      console.error('Error extracting video segment:', error);
      throw new Error('Failed to extract video segment');
    }
    
    ffmpegCommand = `ffmpeg -i "${tempSegmentPath}"`;
    
    if (audioClipFiles && audioClipFiles.length > 0) {
      for (const clip of audioClipFiles) {
        ffmpegCommand += ` -i "${clip.path}"`;
      }
      
      let audioFilterComplex = '';
      
      let mainVideoHasAudio = false;
      try {
        const probeCommand = `ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "${absoluteVideoPath}"`;
        const { stdout } = await execPromise(probeCommand);
        mainVideoHasAudio = stdout.trim() === 'audio';
        console.log(`Main video ${mainVideoHasAudio ? 'has' : 'does not have'} audio stream`);
      } catch (error) {
        console.warn('Error checking for audio stream:', error);
        mainVideoHasAudio = false;
      }
      
      if (mainVideoHasAudio) {
        audioFilterComplex += `[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=1[mainAudio];
`;
      }
      
      for (let i = 0; i < audioClipFiles.length; i++) {
        const clip = audioClipFiles[i];
        const inputIndex = i + 1;
        const startTimeSeconds = clip.startTime;
        
        const maxDuration = trimDuration - startTimeSeconds;
        const actualDuration = Math.min(clip.duration, maxDuration);
        
        console.log(`Audio clip ${i}: start=${startTimeSeconds}s, duration=${actualDuration}s (capped to video duration)`);
        
        audioFilterComplex += `[${inputIndex}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,`;
        audioFilterComplex += `adelay=${Math.round(startTimeSeconds * 1000)}|${Math.round(startTimeSeconds * 1000)},`;
        audioFilterComplex += `atrim=0:${actualDuration},`;
        audioFilterComplex += `volume=1[a${i}];
`;
      }
      
      if (mainVideoHasAudio) {
        audioFilterComplex += `[mainAudio]`;
      }
      
      for (let i = 0; i < audioClipFiles.length; i++) {
        audioFilterComplex += `[a${i}]`;
      }
      
      // Mix all audio streams
      const inputCount = mainVideoHasAudio ? audioClipFiles.length + 1 : audioClipFiles.length;
      audioFilterComplex += `amix=inputs=${inputCount}:duration=longest:normalize=0,atrim=0:${trimDuration},asetpts=PTS-STARTPTS[aout]`;
      
      fs.writeFileSync(filterComplexFile, audioFilterComplex);
      
      ffmpegCommand += ` -filter_complex_script "${filterComplexFile}" -map 0:v -map [aout]`;
    } else {
      ffmpegCommand += ` -c:a copy`;
    }
    
    ffmpegCommand += ` -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p`;
    
    if (audioClipFiles.length === 0 && (audioTrimStart !== videoTrimStart || audioTrimEnd !== videoTrimEnd)) {
      const audioStart = Math.max(0, audioTrimStart - videoTrimStart);
      const audioDuration = Math.min(trimDuration, audioTrimEnd - audioTrimStart);
      
      if (audioStart > 0 || audioDuration < trimDuration) {
        console.log(`Applying audio trim: delay=${audioStart}s, duration=${audioDuration}s`);
        ffmpegCommand += ` -af "adelay=${Math.max(0, audioStart * 1000)}|${Math.max(0, audioStart * 1000)},apad,atrim=0:${audioDuration}"`;
        ffmpegCommand = ffmpegCommand.replace(` -c:a copy`, ` -c:a aac -b:a 192k`);
      }
    } else if (audioClipFiles.length > 0) {
      ffmpegCommand += ` -c:a aac -b:a 192k`;
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