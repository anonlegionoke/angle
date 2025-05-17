"use client";

import { useState, useRef, useEffect } from 'react';
import VideoPreview from '@/components/VideoPreview';
import Timeline from '@/components/Timeline';
import PromptSidebar from '@/components/PromptSidebar';
import LandingPage from '@/components/LandingPage';
import { storeCurrentProject, getCurrentProject, Project, getAllProjects, getLatestProjectVideo } from '@/lib/projectUtils';

const DEFAULT_SIDEBAR_WIDTH = 350;
const SIDEBAR_WIDTH_KEY = 'angle_sidebar_width';

export default function Home() {
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [videoTrimStart, setVideoTrimStart] = useState<number>(0);
  const [videoTrimEnd, setVideoTrimEnd] = useState<number>(0);
  const [audioTrimStart, setAudioTrimStart] = useState<number>(0);
  const [audioTrimEnd, setAudioTrimEnd] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLoopingEnabled, setIsLoopingEnabled] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_SIDEBAR_WIDTH);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dividerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    console.log('App initialized, ready for video generation');
    
    const savedProjectId = getCurrentProject();
    if (savedProjectId) {
      setCurrentProjectId(savedProjectId);
      setShowEditor(true);
    }
    
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth, 10);
        if (!isNaN(parsedWidth) && parsedWidth >= 250 && parsedWidth <= 600) {
          setSidebarWidth(parsedWidth);
        }
      }
    }
  }, []);

  useEffect(() => {
    const handleLoopToggle = () => {
      setIsLoopingEnabled(!isLoopingEnabled);
    };
    
    window.addEventListener('toggleloop', handleLoopToggle);
    
    return () => {
      window.removeEventListener('toggleloop', handleLoopToggle);
    };
  }, [isLoopingEnabled]);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newWidth = window.innerWidth - e.clientX;
        
        const constrainedWidth = Math.max(250, Math.min(600, newWidth));
        setSidebarWidth(constrainedWidth);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
      }
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, sidebarWidth]);
  
  const handleDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      
      setVideoTrimEnd(videoDuration);
      setAudioTrimEnd(videoDuration);
      
      console.log(`Video loaded: ${videoDuration}s`);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleScrub = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVideoTrimStartChange = (newStart: number) => {
    setVideoTrimStart(newStart);
    if (currentTime < newStart) {
      handleScrub(newStart);
    }
  };

  const handleVideoTrimEndChange = (newEnd: number) => {
    setVideoTrimEnd(newEnd);
    if (currentTime > newEnd) {
      handleScrub(newEnd);
    }
  };
  
  const handleAudioTrimStartChange = (newStart: number) => {
    setAudioTrimStart(newStart);
  };
  const handleAudioTrimEndChange = (newEnd: number) => {
    setAudioTrimEnd(newEnd);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
  };
  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleApplyTrim = () => {
    console.log(`Applying video trim from ${videoTrimStart.toFixed(2)}s to ${videoTrimEnd.toFixed(2)}s (duration: ${(videoTrimEnd - videoTrimStart).toFixed(2)}s)`);
    console.log(`Applying audio trim from ${audioTrimStart.toFixed(2)}s to ${audioTrimEnd.toFixed(2)}s (duration: ${(audioTrimEnd - audioTrimStart).toFixed(2)}s)`);
    
    handleScrub(videoTrimStart);
  };
  
  const handleExport = () => {
    console.log('Exporting video with current trim settings...');
    
    alert(`Exporting video with:\n- Format: MP4\n- Video trim: ${videoTrimStart.toFixed(2)}s to ${videoTrimEnd.toFixed(2)}s\n- Audio trim: ${audioTrimStart.toFixed(2)}s to ${audioTrimEnd.toFixed(2)}s`);
  };
  
  const handleResetVideoTrim = () => {
    setVideoTrimStart(0);
    setVideoTrimEnd(duration);
    console.log('Video trim points reset to full duration');
  };
  
  const handleResetAudioTrim = () => {
    setAudioTrimStart(0);
    setAudioTrimEnd(duration);
    console.log('Audio trim points reset to full duration');
  };

  const handlePromptSubmit = async (videoPath: string) => {
    console.log('Received video path:', videoPath);
    setIsGenerating(true);
    
    try {
      if (!videoPath) {
        setVideoSrc('');
        setIsGenerating(false);
        return;
      }
      
      const absoluteVideoPath = videoPath.startsWith('http') 
        ? videoPath 
        : videoPath.startsWith('/') 
          ? videoPath 
          : `/${videoPath}`;
      
      const isNonStandardExt = absoluteVideoPath.includes('.nonvid');
      console.log('Is non-standard extension:', isNonStandardExt);
      
      console.log('Setting video source to:', absoluteVideoPath);
      setVideoSrc(absoluteVideoPath);
      
      setTimeout(() => {
        if (videoRef.current) {
          console.log('Attempting to play video after delay');
          videoRef.current.currentTime = 0;
          
          const onCanPlay = () => {
            console.log('Video can play now');
            videoRef.current?.play()
              .catch(err => {
                console.error('Error playing video after canplay event:', err);
              });
            videoRef.current?.removeEventListener('canplay', onCanPlay);
          };
          
          videoRef.current.addEventListener('canplay', onCanPlay);
          
          videoRef.current.play().catch(err => {
            console.log('Initial play attempt failed, waiting for canplay event:', err);
          });
        }
      }, 300);
    } catch (error) {
      console.error('Error updating video:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartProject = async (projectId: string) => {
    try {
      const projects = await getAllProjects();
      
      const isExistingProject = projects.some((project: Project) => project.id === projectId);
      
      if (!isExistingProject) {
        const createResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId })
        });
        
        if (!createResponse.ok) {
          throw new Error('Failed to create project directory');
        }
        
        const createData = await createResponse.json();
        console.log('New project created:', createData);
      } else {
        console.log('Loading existing project:', projectId);
        
        const latestVideo = await getLatestProjectVideo(projectId);
        if (latestVideo) {
          setVideoSrc(latestVideo);
        } else {
          console.log('No previous videos found for this project');
        }
      }
      
      setCurrentProjectId(projectId);
      storeCurrentProject(projectId);
      setShowEditor(true);
      
    } catch (error) {
      console.error('Error handling project:', error);
      alert('Failed to handle project. Please try again.');
    }
  };

  const handleExitProject = async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentProjectId');
      }
      
      setCurrentProjectId(null);
      setShowEditor(false);
      setVideoSrc('');
  };

  useEffect(() => {
    async function fetchLatestVideo() {
      const latestVideo = await getLatestProjectVideo(currentProjectId!);
      if (latestVideo) {
        setVideoSrc(latestVideo);
      } else {
        console.log('No previous videos found for this project');
      }
    }
    fetchLatestVideo();
  }, [currentProjectId]);  

  if (!showEditor) {
    return <LandingPage onStartProject={handleStartProject} />;
  }

  return (
    <div className="flex flex-col h-screen bg-editor-bg text-white font-mono">
      <header className="p-4 text-center border-b border-editor-border relative">
        <h1 className="text-xl">Angle - AI Video Editor/Generator</h1>
        {currentProjectId && (
          <p className="text-sm text-gray-400 mt-1">Project: {currentProjectId}</p>
        )}
        
        <button 
          onClick={handleExitProject}
          className="absolute right-4 top-4 bg-red-700 hover:bg-red-600 transition-colors text-white px-3 py-1 rounded text-sm"
        >
          Exit Project
        </button>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Main workspace */}
        <div className="flex flex-col flex-1">
          {/* Video preview */}
          <VideoPreview 
            videoRef={videoRef} 
            videoSrc={videoSrc} 
            onMetadataLoaded={handleMetadataLoaded} 
            onTimeUpdate={handleTimeUpdate}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            isMuted={isMuted}
            onMuteToggle={handleMuteToggle}
            videoTrimStart={videoTrimStart}
            videoTrimEnd={videoTrimEnd}
            isLoopingEnabled={isLoopingEnabled}
          />

          {/* Timeline */}
          <Timeline 
            currentTime={currentTime} 
            duration={duration} 
            videoTrimStart={videoTrimStart} 
            videoTrimEnd={videoTrimEnd} 
            audioTrimStart={audioTrimStart} 
            audioTrimEnd={audioTrimEnd} 
            onScrub={handleScrub} 
            onVideoTrimStartChange={handleVideoTrimStartChange} 
            onVideoTrimEndChange={handleVideoTrimEndChange}
            onAudioTrimStartChange={handleAudioTrimStartChange}
            onAudioTrimEndChange={handleAudioTrimEndChange}
            onApplyTrim={handleApplyTrim}
            onExport={handleExport}
            onResetVideoTrim={handleResetVideoTrim}
            onResetAudioTrim={handleResetAudioTrim}
          />
        </div>
        
        {/* Resizable divider */}
        <div 
          ref={dividerRef}
          className="w-1 bg-editor-border hover:bg-blue-500 cursor-col-resize active:bg-blue-700 transition-colors"
          onMouseDown={handleDividerMouseDown}
          title="Drag to resize sidebar"
        />

        {/* Sidebar */}
        <div style={{ width: `${sidebarWidth}px` }} className="h-full border-l border-editor-border">
          <PromptSidebar 
            onPromptSubmit={handlePromptSubmit}
            isGenerating={isGenerating}
            projectId={currentProjectId}
          />
        </div>
      </main>
    </div>
  );
}
