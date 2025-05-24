import { createClient } from "@/utils/supabase/server";
export interface Project {
  id: string;
  createdAt: string;
  timestamp: string;
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

export async function getLatestProjectVideo(projectId: string): Promise<string | null> {
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
      const prompt = data.prompts[i];
      const llmRes = JSON.parse(prompt.llmRes);
      const videoPath = llmRes.videoPath;

      if (videoPath) {
        return videoPath;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching latest project video:', error);
    return null;
  }
} 