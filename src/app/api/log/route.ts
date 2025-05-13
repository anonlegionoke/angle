import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { userMessage, llmResponse, projectId } = await req.json();
    
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const logsDir = projectId 
      ? path.join(tempDir, projectId, 'logs')
      : path.join(tempDir, 'logs');
    
    await fs.mkdir(logsDir, { recursive: true });
    
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      userMessage,
      llmResponse,
    };
    
    const date = new Date().toISOString().split('T')[0];
    const logFilePath = path.join(logsDir, `chat-log-${date}.json`);
    
    let existingLogs: any[] = [];
    try {
      const fileContent = await fs.readFile(logFilePath, 'utf-8');
      existingLogs = JSON.parse(fileContent);
    } catch (error) {
    }
    
    existingLogs.push(logEntry);
    
    await fs.writeFile(
      logFilePath, 
      JSON.stringify(existingLogs, null, 2),
      'utf-8'
    );
    
    console.log(`Chat log saved to ${logFilePath}`);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error logging chat message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to log chat' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    const logsDir = path.join(tempDir, projectId, 'logs');
    
    try {
      await fs.access(logsDir);
    } catch (error) {
      return NextResponse.json({ logs: [] });
    }
    
    const files = await fs.readdir(logsDir);
    const logFiles = files.filter(file => file.startsWith('chat-log-') && file.endsWith('.json'));
    
    logFiles.sort().reverse();
    
    if (logFiles.length > 0) {
      const latestLogFile = logFiles[0];
      const logFilePath = path.join(logsDir, latestLogFile);
      
      const fileContent = await fs.readFile(logFilePath, 'utf-8');
      const logs = JSON.parse(fileContent);
      
      return NextResponse.json({ logs });
    }
    
    return NextResponse.json({ logs: [] });
  } catch (error: any) {
    console.error('Error fetching chat logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}