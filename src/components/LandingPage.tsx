import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LandingPageProps {
  onStartProject: (projectId: string) => void;
}

export default function LandingPage({ onStartProject }: LandingPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-editor-bg text-white">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-6">Angle</h1>
        <p className="text-xl mb-10">AI-Powered Video Editor & Generator</p>
        
        <div className="w-full max-w-3xl mx-auto bg-gray-800 rounded-lg p-6 mb-10">
          <p className="text-sm text-gray-400 mb-2">Featured</p>
          <h2 className="text-2xl mb-4">Create amazing videos with AI</h2>
          <p>Edit and generate professional-quality videos in minutes with our cutting-edge AI technology.</p>
        </div>
        
        <button
          onClick={handleStartProject}
          disabled={isLoading}
          className="bg-white text-black text-editor-bg py-3 px-8 rounded-lg text-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating Project...' : 'Start Project'}
        </button>
      </div>
    </div>
  );
} 