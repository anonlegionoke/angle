"use client";

import { useState, useRef, useEffect } from 'react';
import VideoPreview from '@/components/VideoPreview';
import Timeline from '@/components/Timeline';
import PromptSidebar from '@/components/PromptSidebar';
import LandingPage from '@/components/LandingPage';
import { storeCurrentProject, getCurrentProject, Project, getAllProjects, getLatestProjectVideo } from '@/lib/projectUtils';
import { AudioClip } from '@/components/AudioManager';

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
  const [audioClips, setAudioClips] = useState<AudioClip[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dividerRef = useRef<HTMLDivElement | null>(null);

  // Constants for localStorage keys
  const AUDIO_CLIPS_STORAGE_KEY = 'angle_audio_clips';
  
  useEffect(() => {
    console.log('App initialized, ready for video generation');
    
    const savedProjectId = getCurrentProject();
    if (savedProjectId) {
      setCurrentProjectId(savedProjectId);
      setShowEditor(true);
    }
    
    if (typeof window !== 'undefined') {
      // Load sidebar width from localStorage
      const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth, 10);
        if (!isNaN(parsedWidth) && parsedWidth >= 250 && parsedWidth <= 600) {
          setSidebarWidth(parsedWidth);
        }
      }
      
      // Load audio clips from localStorage
      const savedAudioClips = localStorage.getItem(AUDIO_CLIPS_STORAGE_KEY);
      if (savedAudioClips) {
        try {
          const parsedClips = JSON.parse(savedAudioClips);
          
          // Convert stored data back to AudioClip objects with Blob reconstruction
          const restoredClips = parsedClips.map((clip: any) => {
            // Create a new Blob from the base64 data if it exists
            let blob = new Blob([]);
            if (clip.blobData) {
              const byteCharacters = atob(clip.blobData);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              blob = new Blob([byteArray], { type: clip.blobType || 'audio/webm' });
            }
            
            return {
              ...clip,
              blob: blob,
              // Recreate URL from blob
              url: clip.url || URL.createObjectURL(blob)
            };
          });
          
          console.log('Loaded audio clips from localStorage:', restoredClips.length);
          setAudioClips(restoredClips);
        } catch (error) {
          console.error('Failed to parse saved audio clips:', error);
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

  // Manage synchronized playback of video and audio clips
  const [syncedAudioPlayers, setSyncedAudioPlayers] = useState<{[key: string]: HTMLAudioElement}>({});
  
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const newCurrentTime = videoRef.current.currentTime;
      setCurrentTime(newCurrentTime);
      
      // Check if any audio clips should start or stop playing based on current time
      if (audioClips && audioClips.length > 0) {
        audioClips.forEach(clip => {
          const clipEndTime = clip.startTime + clip.duration;
          
          // If current time is within this clip's range and video is playing
          if (newCurrentTime >= clip.startTime && newCurrentTime < clipEndTime && !videoRef.current?.paused) {
            // If we don't already have this clip playing in sync mode
            if (!syncedAudioPlayers[clip.id]) {
              console.log(`Starting synced playback of audio clip: ${clip.name}`);
              
              // Create new audio element for this clip
              const audio = new Audio(clip.url);
              
              // Calculate where in the clip to start playing
              const offsetIntoClip = newCurrentTime - clip.startTime;
              audio.currentTime = Math.max(0, Math.min(clip.duration, offsetIntoClip));
              
              // Match video volume settings
              audio.volume = videoRef.current?.muted ? 0 : (videoRef.current?.volume || 1);
              
              // Set up cleanup when audio ends
              audio.onended = () => {
                audio.pause();
                setSyncedAudioPlayers(prev => {
                  const updated = {...prev};
                  delete updated[clip.id];
                  return updated;
                });
              };
              
              // Start playing
              audio.play().catch(err => console.error(`Error playing synced audio clip ${clip.name}:`, err));
              
              // Add to tracked synced players
              setSyncedAudioPlayers(prev => ({
                ...prev,
                [clip.id]: audio
              }));
            }
          } 
          // If current time is outside clip range but we have it playing
          else if (syncedAudioPlayers[clip.id]) {
            // Stop this clip
            syncedAudioPlayers[clip.id].pause();
            setSyncedAudioPlayers(prev => {
              const updated = {...prev};
              delete updated[clip.id];
              return updated;
            });
          }
        });
      }
    }
  };

  // Function to stop all synced audio playback
  const stopAllSyncedAudio = () => {
    Object.values(syncedAudioPlayers).forEach(audio => {
      audio.pause();
    });
    setSyncedAudioPlayers({});
  };
  
  const handleVideoEnded = () => {
    // Stop all audio clips when video ends
    Object.values(syncedAudioPlayers).forEach(audio => {
      audio.pause();
    });
    setSyncedAudioPlayers({});
    setCurrentTime(0); // Reset to beginning
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handlePause = () => {
      // Update playback state
      console.log('Video paused');
    };
    
    const handlePlay = () => {
      // Update playback state
      console.log('Video playing');
    };
    
    const handleEnded = () => {
      console.log('Video ended');
      handleVideoEnded();
    };
    
    video.addEventListener('pause', handlePause);
    video.addEventListener('play', handlePlay);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('ended', handleEnded);
    };
  }, [audioClips]);
  
  const handleScrub = (newTime: number) => {
    // Stop all currently playing synced audio when scrubbing
    Object.values(syncedAudioPlayers).forEach(audio => {
      audio.pause();
    });
    setSyncedAudioPlayers({});
    
    // Update the current time in our state
    setCurrentTime(newTime);
    
    // Update video position
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
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
  
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  // Debounce timer reference for localStorage saves
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Function to save audio clips to localStorage with debouncing
  const saveAudioClipsToStorage = (clips: AudioClip[]) => {
    if (typeof window === 'undefined') return;
    
    // Clear any existing timer to implement debouncing
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    // Set a new timer to save after a delay (500ms is usually good for drag operations)
    saveTimerRef.current = setTimeout(() => {
      try {
        // Convert blobs to base64 for storage
        const clipsForStorage = clips.map(clip => {
          // Create a serializable version of the clip
          const serializedClip = {
            ...clip,
            // Store blob type for reconstruction
            blobType: clip.blob.type,
            // Convert blob to base64 string if it's not too large
            blobData: '',
            // We'll keep the URL property but it will be regenerated on load
            url: ''
          };
          
          // Only try to serialize blobs under a certain size to avoid localStorage limits
          if (clip.blob.size < 5 * 1024 * 1024) { // 5MB limit
            const reader = new FileReader();
            reader.readAsDataURL(clip.blob);
            reader.onloadend = () => {
              const base64data = reader.result as string;
              // Remove the data URL prefix (e.g., 'data:audio/webm;base64,')
              const base64Content = base64data.split(',')[1];
              
              // Update this specific clip in storage
              const currentStorage = localStorage.getItem(AUDIO_CLIPS_STORAGE_KEY);
              if (currentStorage) {
                const currentClips = JSON.parse(currentStorage);
                const clipIndex = currentClips.findIndex((c: any) => c.id === clip.id);
                
                if (clipIndex >= 0) {
                  currentClips[clipIndex].blobData = base64Content;
                  localStorage.setItem(AUDIO_CLIPS_STORAGE_KEY, JSON.stringify(currentClips));
                }
              }
            };
          }
          
          return serializedClip;
        });
        
        // Save to localStorage (initial save without blob data, which will be updated asynchronously)
        localStorage.setItem(AUDIO_CLIPS_STORAGE_KEY, JSON.stringify(clipsForStorage));
        console.log(`Saved ${clips.length} audio clips to localStorage`);
      } catch (error) {
        console.error('Failed to save audio clips to localStorage:', error);
      }
    }, 500); // 500ms debounce delay
  };
  
  // Calculate the effective timeline duration based on video and audio clips
  const calculateEffectiveDuration = (videoDuration: number, clips: AudioClip[]) => {
    if (!clips || clips.length === 0) {
      return videoDuration;
    }
    
    // Find the end point of the furthest audio clip
    const furthestAudioEnd = clips.reduce((maxEnd, clip) => {
      const clipEnd = clip.startTime + clip.duration;
      return Math.max(maxEnd, clipEnd);
    }, 0);
    
    // Return the greater of video duration or furthest audio clip end
    return Math.max(videoDuration, furthestAudioEnd);
  };
  
  // Update the timeline duration whenever audio clips change
  useEffect(() => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      const effectiveDuration = calculateEffectiveDuration(videoDuration, audioClips);
      
      if (effectiveDuration > duration) {
        console.log(`Updating timeline duration from ${duration}s to ${effectiveDuration}s due to audio clips`);
        setDuration(effectiveDuration);
        
        // Only extend the trim end if it was at the previous max duration
        if (Math.abs(videoTrimEnd - duration) < 0.1) {
          setVideoTrimEnd(effectiveDuration);
        }
        
        if (Math.abs(audioTrimEnd - duration) < 0.1) {
          setAudioTrimEnd(effectiveDuration);
        }
      }
    }
  }, [audioClips, duration, videoTrimEnd, audioTrimEnd]);
  
  const handleAddAudioClip = (clip: AudioClip) => {
    let newAudioClips: AudioClip[] = [];
    
    // Handle the case when an empty object is received (all clips removed)
    if (clip && Object.keys(clip).length === 0) {
      console.log('Empty clip object received, clearing all audio clips');
      newAudioClips = [];
      setAudioClips(newAudioClips);
      
      // Clear from localStorage when all clips are removed
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUDIO_CLIPS_STORAGE_KEY);
      }
      
      // Reset duration to video duration when all audio clips are removed
      if (videoRef.current) {
        setDuration(videoRef.current.duration);
      }
      return;
    }
    
    const existingClipIndex = audioClips.findIndex(c => c.id === clip.id);
    
    if (existingClipIndex >= 0) {
      // Update existing clip
      const updatedClips = [...audioClips];
      updatedClips[existingClipIndex] = clip;
      newAudioClips = updatedClips;
    } else if (clip && 'id' in clip) {
      // Add new clip
      newAudioClips = [...audioClips, clip];
    } else {
      console.warn('Invalid audio clip object received', clip);
      return;
    }
    
    // Update state with new clips
    setAudioClips(newAudioClips);
    
    // Save to localStorage
    saveAudioClipsToStorage(newAudioClips);
  };

  const handleExport = async () => {
    if (!videoSrc || isExporting) return;
    
    console.log('Exporting video with current trim settings...');
    setIsExporting(true);
    
    try {
      const origin = window.location.origin;
      const exportEndpoint = `${origin}/api/export`;
      
      console.log('Exporting video from source:', videoSrc);
      
      const response = await fetch(exportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoPath: videoSrc,
          videoTrimStart,
          videoTrimEnd,
          audioTrimStart,
          audioTrimEnd
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to export video');
      }
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'exported-video.mp4';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log('Export successful, file downloaded');
      
    } catch (error) {
      console.error('Error exporting video:', error);
      setIsExporting(false);
      alert(`Export failed: ${(error as Error).message}`);
    } finally {
      setIsExporting(false);
    }
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
      if (!currentProjectId) return;
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
          className="absolute right-4 top-4 bg-red-700 hover:bg-red-600 transition-colors text-white px-3 py-1 rounded text-sm cursor-pointer"
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
            sidebarWidth={sidebarWidth}
            isExporting={isExporting}
            audioClips={audioClips}
            onAddAudioClip={handleAddAudioClip}
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
