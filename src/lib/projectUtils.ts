export async function createProjectDirectory(projectId: string): Promise<string> {
  
  console.log(`Creating project directory for ID: ${projectId}`);
  
  const projectPath = `/temp/${projectId}`;
  
  return projectPath;
}

export function getProjectVideoPath(projectId: string, videoName: string): string {
  return `/temp/${projectId}/${videoName}`;
}

export function storeCurrentProject(projectId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentProjectId', projectId);
  }
}

export function getCurrentProject(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('currentProjectId');
  }
  return null;
}

export interface Project {
  id: string;
  createdAt: string;
  timestamp: string;
}

export async function getAllProjects(): Promise<Project[]> {
  try {
    const response = await fetch('/api/projects');
    if (!response.ok) {
      console.error('Failed to fetch projects:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data.projects || [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
} 