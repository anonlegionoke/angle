export interface Project {
  id: string;
  createdAt: string;
  timestamp: string;
  promptId?: string;
  videoPath?: string;
}

export function storeCurrentProject(projectId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentProjectId', projectId);
  }
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

export async function getLatestProject(projectId: string): Promise<Partial<Project> | null> {
  try {
    const response = await fetch(`/api/prompts?projectId=${projectId}`);
    if (!response.ok) {
      console.error('Failed to fetch project logs:', response.statusText);
      return null;
    }
    
    const data = await response.json();

    
    if (!data.prompts || data.prompts.length === 0) {
      return null;
    }
    
    for (let i = data.prompts.length - 1; i >= 0; i--) {
      const { id } = data.prompts[i];
    
      const videoPath = await getVideoUrl(id);
      
      if (videoPath && id) {
        return { videoPath, id };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching latest project:', error);
    return null;
  }
} 

export async function getVideoUrl(promptId: string): Promise<string> {
  try {
    const response = await fetch(`/api/prompts/video?promptId=${promptId}`);
    if (!response.ok) {
      throw new Error('Failed to get video URL');
    }
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error getting video URL:', error);
    throw error;
  }
} 