import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { ReadableStream as WebReadableStream } from 'stream/web';
import { NextResponse } from 'next/server';

const THUMBNAILS_DIR = '/tmp/thumbnails';
const TMP_DIR = '/tmp';

function ensureDirectories() {
  try {
    if (!fs.existsSync(THUMBNAILS_DIR)) {
      fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
    }
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating directories:', error);
    throw error;
  }
}

function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
    exec(cmd, (error, stdout) => {
      if (error) return reject(error);
      const duration = parseFloat(stdout);
      if (isNaN(duration)) {
        reject(new Error("Invalid duration"));
      } else {
        resolve(duration);
      }
    });
  });
}

export async function POST(request: Request) {
  try {
    ensureDirectories();

    const body = await request.json();
    const { videoUrl } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 });
    }

    const id = uuidv4();
    const inputPath = path.join(TMP_DIR, `${id}.mp4`);

    const response = await fetch(videoUrl);
    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Failed to download video' }, { status: 500 });
    }

    const nodeStream = Readable.fromWeb(response.body as WebReadableStream);
    const fileStream = fs.createWriteStream(inputPath);

    await new Promise<void>((resolve, reject) => {
      nodeStream.pipe(fileStream);
      fileStream.on('finish', () => resolve());
      fileStream.on('error', reject);
    });

    const duration = await getVideoDuration(inputPath);

    const frameCount = Math.max(1, Math.floor(duration / 2)); 

    const cmd = `ffmpeg -i "${inputPath}" -vf "fps=${frameCount / duration}" -vframes ${frameCount} "${THUMBNAILS_DIR}/thumb_${id}_%02d.jpg"`;

    await new Promise<void>((resolve, reject) => {
      exec(cmd, (err) => (err ? reject(err) : resolve()));
    });

    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    const thumbnails = Array.from({ length: frameCount }, (_, i) =>
      `/thumbnails/thumb_${id}_` + (i + 1).toString().padStart(2, '0') + `.jpg`
    );

    return NextResponse.json({ thumbnails }, { status: 200 });
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    return NextResponse.json({ error: 'Failed to generate thumbnails' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    ensureDirectories();

    if (!fs.existsSync(THUMBNAILS_DIR)) {
      return NextResponse.json({ message: 'No thumbnails to delete' }, { status: 200 });
    }

    const files = fs.readdirSync(THUMBNAILS_DIR);
    for (const file of files) {
      const filePath = path.join(THUMBNAILS_DIR, file);
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.warn(`Failed to delete thumbnail ${file}:`, error);
      }
    }

    return NextResponse.json({ message: 'Thumbnails deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting thumbnails:', error);
    return NextResponse.json({ error: 'Failed to delete thumbnails' }, { status: 500 });
  }
}
