import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const baseDir = path.join(process.cwd(), 'public', 'temp');
    const projectDir = path.join(baseDir, projectId);
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    return NextResponse.json({ 
      success: true, 
      projectPath: projectDir 
    });
  } catch (error) {
    console.error('Error creating project directory:', error);
    return NextResponse.json(
      { error: 'Failed to create project directory' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const baseDir = path.join(process.cwd(), 'public', 'temp');
    
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      return NextResponse.json({ projects: [] });
    }
    
    const items = fs.readdirSync(baseDir, { withFileTypes: true });
    
    const projectDirs = items
      .filter(item => item.isDirectory() && item.name.startsWith('project_'))
      .map(dir => {
        const stats = fs.statSync(path.join(baseDir, dir.name));
        return {
          id: dir.name,
          createdAt: stats.birthtime.toISOString(),
          timestamp: dir.name.split('_')[1] || stats.birthtime.getTime().toString()
        };
      })
      .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp));
    
    return NextResponse.json({ projects: projectDirs });
  } catch (error) {
    console.error('Error retrieving projects:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve projects', projects: [] },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    const baseDir = path.join(process.cwd(), 'public', 'temp');
    const projectDir = path.join(baseDir, projectId);
    
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Project ${projectId} has been deleted`
    });
  } catch (error) {
    console.error('Error deleting project directory:', error);
    return NextResponse.json(
      { error: 'Failed to delete project directory' },
      { status: 500 }
    );
  }
} 