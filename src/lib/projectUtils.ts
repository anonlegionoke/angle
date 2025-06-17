import { createClient } from "@/utils/supabase/client";

export interface Project {
  id: string;
  createdAt: string;
  timestamp: string;
  promptId?: string;
  videoPath?: string;
}

/* Project Management */

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

      if (id) {
        let videoPath: string | undefined;

        try {
          videoPath = await getVideoUrl(projectId, id);
        } catch (e) {
          console.warn(`Failed to get video URL for prompt ${id}:`, e);
        }

        return { id, videoPath };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching latest project:', error);
    return null;
  }
}

/* Video Management */

export async function getVideoUrl(projectId:string, promptId: string): Promise<string> {
  try {
    const response = await fetch(`/api/prompts/video?promptId=${promptId}&projectId=${projectId}`);
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

/* Code Management */

export async function getCodeUrl({
  code,
  promptId,
  projectId,
  supabase,
}: {
  code: string;
  promptId: string;
  projectId: string;
  supabase: ReturnType<typeof createClient>;
}): Promise<string> {
  try {
    
    const { error: insertError } = await supabase
      .storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_CODE_BUCKET_NAME!)
      .upload(`${projectId}/${promptId}/code_${promptId}.py`, Buffer.from(code), {
        contentType: 'text/x-python',
        upsert: true,
      });

    if (insertError) {
      throw new Error(`Failed to insert code: ${insertError.message}`);
    }

    const { data: signedUrl, error: signedUrlError } = await supabase
      .storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_CODE_BUCKET_NAME!)
      .createSignedUrl(`${projectId}/${promptId}/code_${promptId}.py`, 10800);

    if (signedUrlError) {
      throw new Error(`Code not found: ${signedUrlError.message}`);
    }

    return signedUrl.signedUrl;
  } catch (error) {
    console.error(error);
    throw error;
  }
}