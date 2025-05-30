import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { ReadableStream as WebReadableStream } from 'stream/web';
import { NextResponse } from 'next/server';

const THUMBNAILS_DIR = path.join(process.cwd(), 'public', 'thumbnails');
const TMP_DIR = path.join(process.cwd(), 'tmp');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { videoUrl } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 });
    }

    fs.mkdirSync(TMP_DIR, { recursive: true });
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });

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

    // Max 10 frames
    const cmd = `ffmpeg -i "${inputPath}" -vf "fps=1" -vframes 10 "${THUMBNAILS_DIR}/thumb_${id}_%02d.jpg"`;

    await new Promise<void>((resolve, reject) => {
      exec(cmd, (err) => (err ? reject(err) : resolve()));
    });

    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    const thumbnails = Array.from({ length: 10 }, (_, i) =>
      `/thumbnails/thumb_${id}_` + i.toString().padStart(2, '0') + `.jpg`
    );

    return NextResponse.json({ thumbnails }, { status: 200 });
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    return NextResponse.json({ error: 'Failed to generate thumbnails' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
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
