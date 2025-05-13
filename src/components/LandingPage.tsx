import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project, getAllProjects } from '@/lib/projectUtils';

interface LandingPageProps {
  onStartProject: (projectId: string) => void;
}

export default function LandingPage({ onStartProject }: LandingPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoadingProjects(true);
        const fetchedProjects = await getAllProjects();
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  const handleStartProject = async () => {
    setIsLoading(true);
    
    try {
      const projectId = `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      onStartProject(projectId);
      
    } catch (error) {
      console.error('Error creating project:', error);
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getProjectName = (projectId: string) => {
    const namePart = projectId.split('_')[2] || '';
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-editor-bg text-white">
      <div className="text-center mb-4">
        <h1 className="text-5xl font-bold mb-6">Angle</h1>
        <p className="text-xl mb-10">AI-Powered Video Editor & Generator</p>
        
        <div className="w-full max-w-3xl mx-auto bg-gray-800 rounded-lg p-6 mb-10">
          <p className="text-sm text-gray-400 mb-2">Featured</p>
          <h2 className="text-2xl mb-4">Create amazing videos with AI</h2>
          <p>Edit and generate professional-quality videos in minutes with our cutting-edge AI technology.</p>
        </div>
      </div>

      {/* Create new project button */}
    <div className="text-center pb-12">
          <button
            onClick={handleStartProject}
            disabled={isLoading}
            className="bg-white text-black py-3 px-8 rounded-lg text-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center mx-auto"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-800 mr-2"></div>
                Creating New Project...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create New Project
              </>
            )}
          </button>
        </div>
      
      <div className="w-full max-w-4xl mx-auto">
        {/* Existing projects section */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-6 text-center">Your Projects</h2>
          {isLoadingProjects ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
              <p>Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-400 text-lg">No existing projects</p>
              <p className="text-gray-500 mt-2">Create your first project to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => (
                <div 
                  key={project.id} 
                  className="bg-gray-800 rounded-lg p-5 cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700 flex flex-col"
                  onClick={() => onStartProject(project.id)}
                >
                  <div className="flex items-center mb-3">
                    <div className="bg-blue-500 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold mr-3">
                      {getProjectName(project.id).charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium truncate">{getProjectName(project.id)}</h3>
                      <p className="text-xs text-gray-400">{project.id}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-3 border-t border-gray-700 flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                      {getRelativeTime(project.createdAt)}
                    </span>
                    <span className="bg-gray-700 text-xs rounded-full px-2 py-1">
                      Open
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 