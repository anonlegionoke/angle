"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Project, getAllProjects } from '@/lib/projectUtils';
import { createClient } from '@/utils/supabase/client';

interface LandingPageProps {
  onStartProject: (projectId: string) => void;
}

export const generateProjectId = () => {
  return `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export default function LandingPage({ onStartProject }: LandingPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
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
  }, [isClearing]);

  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
          setUserEmail(user.email);
          setUserId(user.id);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUserEmail();
  }, []);

  const handleStartProject = async () => {
    setIsLoading(true);
    
    try {
      const projectId = generateProjectId();
      
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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleClearVideos = async () => {
    if (isClearing) return;
    
    const isConfirmed = window.confirm('Are you sure you want to delete all projects? This action cannot be undone.');
    
    if (!isConfirmed) {
      return;
    }
    
    setIsClearing(true);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: {  
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear videos');
      }      
      
    } catch (error) {
      console.error('Error clearing videos:', error);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-editor-bg text-white overflow-y-auto max-h-screen pt-4 relative">
      <div className="absolute top-4 right-4 flex flex-col items-end">
        {userEmail && (
          <div className="text-gray-300 text-xs mb-2">{userEmail}</div>
        )}
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-1 px-3 rounded transition-colors flex items-center cursor-pointer"
        >
          {isLoggingOut ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white mr-1"></div>
              Logging out...
            </>
          ) : (
            'Logout'
          )}
        </button>
      </div>
      <div className="text-center my-4">
      <h1 className="text-5xl font-bold mb-4 relative overflow-hidden">
        <motion.div
          className="inline-flex items-center"
        >
          <motion.span 
            className="inline-block"
            initial={{ x: 200 }}
            animate={{ x: 0 }}
            transition={{ 
              duration: 1.5, 
              type: "spring", 
              stiffness: 40,
              damping: 12
            }}
          >
            <img src="/angle-glow-icon_light.png" alt="angle-logo" className="inline-block h-16 w-16 mr-2 mb-2" />
          </motion.span>
          <motion.span 
            className="inline-block text-5xl"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              duration: 1, 
              delay: 1, 
              type: "spring", 
              stiffness: 40
            }}
          >
            Angle
          </motion.span>
        </motion.div>
      </h1>
        <div className="w-full max-w-3xl mx-auto bg-gray-800 rounded-lg p-6 mb-10">
          <h2 className="text-2xl mb-4">Create amazing videos with AI</h2>
          <p>Edit and generate professional-quality videos in minutes for your presentations, tutorials, and more.</p>
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
            <div className="text-center py-7 bg-gray-800 rounded-lg border border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-400 text-lg">No existing projects</p>
              <p className="text-gray-500 mt-2">Create your first project to get started!</p>
            </div>
          ) : (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleClearVideos}
                disabled={isClearing}
                className={`text-xs px-2 py-1 rounded ${
                  isClearing ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-red-800 hover:bg-red-700 text-white'
                }`}
              >
                {isClearing ? 'Clearing...' : 'Clear all projects'}
              </button>
            </div>
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
          </>
          )}
        </div>
      </div>
    </div>
  );
} 