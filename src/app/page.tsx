"use client";

import { useState, useRef, useEffect } from 'react';
import VideoPreview from '@/components/VideoPreview';
import Timeline from '@/components/Timeline';
import PromptSidebar from '@/components/PromptSidebar';
import LandingPage from '@/components/LandingPage';
import LoadingOverlay from '@/components/LoadingOverlay';
import { storeCurrentProject, getCurrentProject, Project, getAllProjects, getLatestProjectVideo } from '@/lib/projectUtils';
import { AudioClip } from '@/components/AudioManager';

const DEFAULT_SIDEBAR_WIDTH = 350;
const SIDEBAR_WIDTH_KEY = 'angle_sidebar_width';
const DEFAULT_TIMELINE_HEIGHT_RATIO = 0.3;
const TIMELINE_HEIGHT_RATIO_KEY = 'angle_timeline_height_ratio';

export default function Home() {
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const base64Content = base64data.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
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
  const [timelineHeightRatio, setTimelineHeightRatio] = useState<number>(DEFAULT_TIMELINE_HEIGHT_RATIO);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState<boolean>(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [audioClips, setAudioClips] = useState<AudioClip[]>([]);
  const [audioBlobUrls, setAudioBlobUrls] = useState<{[key: string]: string}>({});
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading resources...'); 

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sideBarDividerRef = useRef<HTMLDivElement | null>(null);
  const timelineDividerRef = useRef<HTMLDivElement | null>(null);

  const getAudioClipsStorageKey = (projectId: string | null) => {
    return projectId ? `angle_audio_clips_${projectId}` : 'angle_audio_clips';
  };
  const AUDIO_CLIPS_STORAGE_KEY = getAudioClipsStorageKey(currentProjectId);
  
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
      
      const savedHeightRatio = localStorage.getItem(TIMELINE_HEIGHT_RATIO_KEY);
      if (savedHeightRatio) {
        const parsedRatio = parseFloat(savedHeightRatio);
        if (!isNaN(parsedRatio) && parsedRatio >= 0.1 && parsedRatio <= 0.7) {
          setTimelineHeightRatio(parsedRatio);
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
    return () => {
      Object.values(audioBlobUrls).forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [audioBlobUrls]);

  const blobUrlsRef = useRef<Map<string, string>>(new Map());
  
  useEffect(() => {
    const urlsToRevoke = new Map<string, string>();
    
    if (typeof window !== 'undefined' && currentProjectId) {
      setIsLoading(true);
      setLoadingMessage('Loading audio clips...');
      
      const projectSpecificKey = getAudioClipsStorageKey(currentProjectId);
      const savedAudioClips = localStorage.getItem(projectSpecificKey);
      
      if (savedAudioClips) {
        try {
          const parsedClips = JSON.parse(savedAudioClips);
          
          const restoredClips = parsedClips.map((clip: any) => {
            let blob;
            let url = '';
            
            if (clip.blobData) {
              try {
                const byteCharacters = atob(clip.blobData);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], { type: clip.blobType || 'audio/webm' });
                
                url = URL.createObjectURL(blob);
                urlsToRevoke.set(clip.id, url);
                console.log(`Created new blob URL for clip ${clip.id}: ${url}`);
              } catch (blobError) {
                console.error(`Failed to create blob for clip ${clip.id}:`, blobError);
                blob = new Blob([], { type: 'audio/webm' });
                url = URL.createObjectURL(blob);
                urlsToRevoke.set(clip.id, url);
              }
            } else {
              console.warn(`No blob data available for clip ${clip.id}`);
              blob = new Blob([], { type: 'audio/webm' });
              url = URL.createObjectURL(blob);
              urlsToRevoke.set(clip.id, url);
            }
            
            return {
              ...clip,
              blob: blob,
              url: url 
            };
          });
          
          console.log(`Loaded ${restoredClips.length} audio clips for project ${currentProjectId} from localStorage`);
          setAudioClips(restoredClips);
        } catch (error) {
          console.error('Failed to parse saved audio clips:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setAudioClips([]);
        console.log(`No saved audio clips found for project ${currentProjectId}`);
        setIsLoading(false);
      }
    }
    
    blobUrlsRef.current = urlsToRevoke;
    
    return () => {
      blobUrlsRef.current.forEach((url, id) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.error(`Failed to revoke URL for clip ${id}:`, e);
        }
      });
      blobUrlsRef.current.clear();
    };
  }, [currentProjectId]);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSidebar) {
        const newWidth = window.innerWidth - e.clientX;
        
        const constrainedWidth = Math.max(250, Math.min(600, newWidth));
        setSidebarWidth(constrainedWidth);
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingSidebar(false);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
      }
    };
    
    if (isDraggingSidebar) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSidebar, sidebarWidth]);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingTimeline) {
        const mainContainer = document.querySelector('main');
        if (!mainContainer) return;
        
        const mainRect = mainContainer.getBoundingClientRect();
        const mainHeight = mainRect.height;
        
        const mouseYRelativeToMain = e.clientY - mainRect.top;
        const ratio = 1 - (mouseYRelativeToMain / mainHeight);
        
        const constrainedRatio = Math.max(0.1, Math.min(0.7, ratio));
        setTimelineHeightRatio(constrainedRatio);
        
        e.preventDefault();
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingTimeline(false);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(TIMELINE_HEIGHT_RATIO_KEY, timelineHeightRatio.toString());
      }
    };
    
    if (isDraggingTimeline) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingTimeline, timelineHeightRatio]);
  
  const handleSidebarDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
  };

  const handleTimelineDividerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingTimeline(true);
  };

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      
      setVideoTrimEnd(videoDuration);
      setAudioTrimEnd(videoDuration);
      
      console.log(`Video loaded: ${videoDuration}s`);
      setIsLoading(false);
    }
  };

  const [syncedAudioPlayers, setSyncedAudioPlayers] = useState<{[key: string]: HTMLAudioElement}>({});
  
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const newCurrentTime = videoRef.current.currentTime;
      setCurrentTime(newCurrentTime);
      
      if (newCurrentTime >= videoTrimEnd) {
        stopAllSyncedAudio();
        return;
      }
      
      if (audioClips && audioClips.length > 0) {
        audioClips.forEach(clip => {
          const clipEndTime = clip.startTime + clip.duration;
          
          if (newCurrentTime >= clip.startTime && 
              newCurrentTime < clipEndTime && 
              newCurrentTime >= videoTrimStart && 
              newCurrentTime < videoTrimEnd && 
              !videoRef.current?.paused) {
            
            if (!syncedAudioPlayers[clip.id]) {
              console.log(`Starting synced playback of audio clip: ${clip.name}`);
              
              let audioUrl = clip.url;
              if ((!audioUrl.startsWith('blob:') || audioUrl.includes('ERR_REQUEST_RANGE_NOT_SATISFIABLE')) && clip.blob) {
                if (audioBlobUrls[clip.id]) {
                  URL.revokeObjectURL(audioBlobUrls[clip.id]);
                }
                audioUrl = URL.createObjectURL(clip.blob);
                setAudioBlobUrls(prev => ({
                  ...prev,
                  [clip.id]: audioUrl
                }));
                
                setAudioClips(prev => prev.map(c => 
                  c.id === clip.id ? {...c, url: audioUrl} : c
                ));
              }
              
              const audio = new Audio(audioUrl);
              
              const offsetIntoClip = newCurrentTime - clip.startTime;
              audio.currentTime = Math.max(0, Math.min(clip.duration, offsetIntoClip));
              
              audio.volume = videoRef.current?.muted ? 0 : (videoRef.current?.volume || 1);
              
              audio.onended = () => {
                audio.pause();
                setSyncedAudioPlayers(prev => {
                  const updated = {...prev};
                  delete updated[clip.id];
                  return updated;
                });
              };
              
              audio.play().catch(err => {
                console.error(`Error playing synced audio clip ${clip.name}:`, err);
                audio.pause();
                setSyncedAudioPlayers(prev => {
                  const updated = {...prev};
                  delete updated[clip.id];
                  return updated;
                });
              });
              
              setSyncedAudioPlayers(prev => ({
                ...prev,
                [clip.id]: audio
              }));
            }
          } 
          else if (syncedAudioPlayers[clip.id]) {
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

  const stopAllSyncedAudio = () => {
    Object.values(syncedAudioPlayers).forEach(audio => {
      audio.pause();
    });
    setSyncedAudioPlayers({});
  };
  
  const handleVideoEnded = () => {
    Object.values(syncedAudioPlayers).forEach(audio => {
      audio.pause();
    });
    setSyncedAudioPlayers({});
    setCurrentTime(0);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handlePause = () => {
      console.log('Video paused');
    };
    
    const handlePlay = () => {
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
    Object.values(syncedAudioPlayers).forEach(audio => {
      audio.pause();
    });
    setSyncedAudioPlayers({});
    
    setCurrentTime(newTime);
    
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
  
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const getStringByteSize = (str: string): number => {
    return str.length * 2;
  };

  const checkLocalStorageSpace = (): { used: number, available: number } => {
    let total = 0;
    let data = "";
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key) || "";
        total += getStringByteSize(key) + getStringByteSize(value);
      }
    }
    
    const maxSize = 4.5 * 1024 * 1024;
    return {
      used: total,
      available: Math.max(0, maxSize - total)
    };
  };

  const compressAudioData = async (blob: Blob, maxSizeBytes: number): Promise<Blob> => {
    if (blob.size <= maxSizeBytes) {
      return blob;
    }
    
    console.warn(`Audio blob size (${blob.size} bytes) exceeds the target size (${maxSizeBytes} bytes)`); 
    return blob;
  };

  const saveAudioClipsToStorage = (clips: AudioClip[]) => {
    if (typeof window === 'undefined' || !currentProjectId) return;
    
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    
    saveTimerRef.current = setTimeout(async () => {
      try {
        const projectSpecificKey = getAudioClipsStorageKey(currentProjectId);
        
        const { available } = checkLocalStorageSpace();
        console.log(`Available localStorage space: ~${Math.round(available / 1024)}KB`);
        
        const safeAvailable = available * 0.9;
        const maxBlobSizeBytes = Math.min(1 * 1024 * 1024, safeAvailable / (clips.length || 1));
        
        const sortedClips = [...clips].sort((a, b) => {
          const getTimestamp = (id: string) => {
            const match = id.match(/audio-(\d+)/);
            return match ? parseInt(match[1]) : 0;
          };
          return getTimestamp(b.id) - getTimestamp(a.id);
        });
        
        const clipsForStorage = sortedClips.map(clip => {
          return {
            ...clip,
            blobType: clip.blob.type,
            blobData: '',
            url: ''
          };
        });
        
        try {
          localStorage.setItem(projectSpecificKey, JSON.stringify(clipsForStorage));
        } catch (e) {
          console.error('Failed to save even basic clip metadata. Clearing old data and retrying.');
          for (let key in localStorage) {
            if (key.startsWith('angle_audio_clips_') && key !== projectSpecificKey) {
              localStorage.removeItem(key);
              console.log(`Removed old audio data: ${key}`);
            }
          }
          localStorage.setItem(projectSpecificKey, JSON.stringify(clipsForStorage));
        }
        
        for (let i = 0; i < sortedClips.length; i++) {
          const clip = sortedClips[i];
          
          if (clip.blob.size > 5 * 1024 * 1024) {
            console.warn(`Skipping blob storage for clip ${clip.id} (${clip.name}): size exceeds 5MB`);
            continue;
          }
          
          try {
            const processedBlob = await compressAudioData(clip.blob, maxBlobSizeBytes);
            
            const base64Content = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64data = reader.result as string;
                const base64Content = base64data.split(',')[1];
                resolve(base64Content);
              };
              reader.onerror = reject;
              reader.readAsDataURL(processedBlob);
            });
            
            const currentStorage = localStorage.getItem(projectSpecificKey);
            if (currentStorage) {
              const currentClips = JSON.parse(currentStorage);
              const clipIndex = currentClips.findIndex((c: any) => c.id === clip.id);
              
              if (clipIndex >= 0) {
                currentClips[clipIndex].blobData = base64Content;
                try {
                  localStorage.setItem(projectSpecificKey, JSON.stringify(currentClips));
                } catch (storageError) {
                  console.warn(`Storage quota exceeded for clip ${i+1}/${sortedClips.length}. Saving without blob data.`);
                  currentClips[clipIndex].blobData = '';
                  localStorage.setItem(projectSpecificKey, JSON.stringify(currentClips));
                  break;
                }
              }
            }
          } catch (blobError) {
            console.error(`Failed to process blob for clip ${clip.id}:`, blobError);
          }
        }
        
        console.log(`Saved ${clips.length} audio clips for project ${currentProjectId} to localStorage`);
      } catch (error) {
        console.error('Failed to save audio clips to localStorage:', error);
        alert('Warning: Some audio data couldn\'t be saved due to storage limitations. Your audio clips will still work in the current session, but may not persist after reload.');
      }
    }, 500); // 500ms debounce delay
  };
  
  const calculateEffectiveDuration = (videoDuration: number, clips: AudioClip[]) => {
    if (!clips || clips.length === 0) {
      return videoDuration;
    }
    
    const furthestAudioEnd = clips.reduce((maxEnd, clip) => {
      const clipEnd = clip.startTime + clip.duration;
      return Math.max(maxEnd, clipEnd);
    }, 0);
    
    return Math.max(videoDuration, furthestAudioEnd);
  };
  
  useEffect(() => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      const effectiveDuration = calculateEffectiveDuration(videoDuration, audioClips);
      
      if (effectiveDuration > duration) {
        console.log(`Updating timeline duration from ${duration}s to ${effectiveDuration}s due to audio clips`);
        setDuration(effectiveDuration);
        
        if (Math.abs(videoTrimEnd - duration) < 0.1) {
          setVideoTrimEnd(effectiveDuration);
        }
        
        if (Math.abs(audioTrimEnd - duration) < 0.1) {
          setAudioTrimEnd(effectiveDuration);
        }
      }
    }
  }, [audioClips, duration, videoTrimEnd, audioTrimEnd]);
  
  const handleRemoveAudioClip = (clipId: string) => {
    console.log(`Removing audio clip with ID: ${clipId}`);
    
    const updatedClips = audioClips.filter(clip => clip.id !== clipId);
    console.log(`Updated clips length: ${updatedClips.length}`);
    
    setAudioClips(updatedClips);
    
    saveAudioClipsToStorage(updatedClips);
    
    if (updatedClips.length === 0 && videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleAddAudioClip = (clip: AudioClip) => {
    let newAudioClips: AudioClip[] = [];
    
    if (clip && clip.blob && !clip._delete) {
      if (audioBlobUrls[clip.id]) {
        URL.revokeObjectURL(audioBlobUrls[clip.id]);
      }
      
      const blobUrl = URL.createObjectURL(clip.blob);
      
      setAudioBlobUrls(prev => ({
        ...prev,
        [clip.id]: blobUrl
      }));
      
      clip = {
        ...clip,
        url: blobUrl
      };
    }
    
    if (clip && Object.keys(clip).length === 0) {
      console.log('Empty clip object received, clearing all audio clips');
      newAudioClips = [];
      setAudioClips(newAudioClips);
      
      if (typeof window !== 'undefined' && currentProjectId) {
        try {
          const projectSpecificKey = getAudioClipsStorageKey(currentProjectId);
          localStorage.removeItem(projectSpecificKey);
        } catch (error) {
          console.error('Failed to remove audio clips from localStorage:', error);
        }
      }
      
      if (videoRef.current) {
        setDuration(videoRef.current.duration);
      }
      return;
    }
    
    if (clip && '_delete' in clip) {
      console.log('Received clip with _delete flag:', clip);
      console.log(`Attempting to delete audio clip: ${clip.name} (ID: ${clip.id})`);
      console.log('Current audioClips:', audioClips);
      
      const clipExists = audioClips.some(c => c.id === clip.id);
      console.log(`Clip with ID ${clip.id} exists in audioClips array: ${clipExists}`);
      
      if (clipExists) {
        if (audioBlobUrls[clip.id]) {
          URL.revokeObjectURL(audioBlobUrls[clip.id]);
          setAudioBlobUrls(prev => {
            const updated = {...prev};
            delete updated[clip.id];
            return updated;
          });
        }
        
        newAudioClips = audioClips.filter(c => c.id !== clip.id);
        console.log(`Filtered audioClips, new length: ${newAudioClips.length}`);
        setAudioClips(newAudioClips);
        
        if (newAudioClips.length === 0 && videoRef.current) {
          console.log('No clips left, resetting duration to video duration');
          setDuration(videoRef.current.duration);
        }
        
        console.log('Saving updated clips to storage');
        saveAudioClipsToStorage(newAudioClips);
      } else {
        console.warn(`Could not find clip with ID ${clip.id} to delete`);
      }
      
      return;
    }
    
    const existingClipIndex = audioClips.findIndex(c => c.id === clip.id);
    
    if (existingClipIndex >= 0) {
      const updatedClips = [...audioClips];
      updatedClips[existingClipIndex] = clip;
      newAudioClips = updatedClips;
    } else if (clip && 'id' in clip) {
      newAudioClips = [...audioClips, clip];
    } else {
      console.warn('Invalid audio clip object received', clip);
      return;
    }
    
    setAudioClips(newAudioClips);
    saveAudioClipsToStorage(newAudioClips);
  };

  const handleExport = async () => {
    if (!videoSrc || isExporting) return;
    
    console.log('Exporting video with current trim settings...');
    setIsExporting(true);
    
    try {
      const exportEndpoint = '/api/export';
            
      const effectiveVideoTrimStart = videoTrimStart;
      const effectiveVideoTrimEnd = videoTrimEnd;
      
      const trimDuration = effectiveVideoTrimEnd - effectiveVideoTrimStart;
      console.log(`Exporting trimmed video segment: ${effectiveVideoTrimStart.toFixed(2)}s to ${effectiveVideoTrimEnd.toFixed(2)}s (duration: ${trimDuration.toFixed(2)}s)`);
      
      const adjustedAudioClips = audioClips.map(clip => {
        const clipEnd = clip.startTime + clip.duration;
        const overlapStart = Math.max(clip.startTime, effectiveVideoTrimStart);
        const overlapEnd = Math.min(clipEnd, effectiveVideoTrimEnd);
        
        if (overlapEnd <= overlapStart) {
          return null;
        }
        
        const adjustedStartTime = Math.max(0, overlapStart - effectiveVideoTrimStart);
        const adjustedDuration = overlapEnd - overlapStart;
        
        return {
          ...clip,
          exportStartTime: adjustedStartTime,
          exportDuration: adjustedDuration
        };
      }).filter(Boolean);
      
      console.log(`Exporting ${adjustedAudioClips.length} adjusted audio clips`);
      
      const audioClipsDataPromises = adjustedAudioClips.map(async (clip) => ({
        id: clip!.id,
        name: clip!.name,
        startTime: clip!.exportStartTime,
        duration: clip!.exportDuration,
        blobBase64: await blobToBase64(clip!.blob)
      }));
      
      const audioClipsData = await Promise.all(audioClipsDataPromises);
      
      console.log(`Preparing to export video with ${audioClipsData.length} audio clips`);
      
      const response = await fetch(exportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          videoPath: videoSrc,
          videoTrimStart: effectiveVideoTrimStart,
          videoTrimEnd: effectiveVideoTrimEnd,
          audioTrimStart: effectiveVideoTrimStart,
          audioTrimEnd: effectiveVideoTrimEnd,
          audioClips: audioClipsData
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
    setIsLoading(true);
    setLoadingMessage('Loading project...');
    
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleExitProject = async () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      
      Object.values(syncedAudioPlayers).forEach(audio => {
        audio.pause();
      });
      setSyncedAudioPlayers({});
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentProjectId');
      }
      
      setCurrentProjectId(null);
      setDuration(0);
      setShowEditor(false);
      setVideoSrc('');
  };

  useEffect(() => {
    async function fetchLatestVideo() {
      if (!currentProjectId) return;
      
      setIsLoading(true);
      setLoadingMessage('Loading latest updates...');
      
      try {
        const latestVideo = await getLatestProjectVideo(currentProjectId!);
        if (latestVideo) {
          setVideoSrc(latestVideo);
        } else {
          console.log('No previous videos found for this project');
        }
      } catch (error) {
        console.error('Error fetching latest video:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLatestVideo();
  }, [currentProjectId]);  

  if (!showEditor) {
    return <LandingPage onStartProject={handleStartProject} />;
  }

  return (
    <div className="flex flex-col h-screen bg-editor-bg text-white font-mono">
      <LoadingOverlay isLoading={isLoading} message={loadingMessage} />
      <header className="p-2 text-left border-b border-editor-border relative">
        <h1 className="text-xl"><span className="mr-2"><img src="/angle-glow-icon.png" alt="angle-logo" className="inline-block h-8 w-8" /></span>Angle - AI Video Maker</h1>
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
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Video preview */}
          <div style={{ flex: `${1 - timelineHeightRatio}` }} className="min-h-0 overflow-hidden">
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
          </div>
        
        {/* Resizable divider - Timeline */}
        <div 
          ref={timelineDividerRef}
          className="h-1 bg-editor-border hover:bg-blue-500 cursor-row-resize active:bg-blue-700 transition-colors flex items-center justify-center"
          onMouseDown={handleTimelineDividerMouseDown}
          title="Drag to resize timeline"
        >
          <div className="w-16 h-1 bg-gray-400 rounded-full"></div>
        </div>

          {/* Timeline */}
        <div style={{ flex: timelineHeightRatio }} className="w-full border-l border-editor-border overflow-y-auto min-h-0">
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
            onRemoveAudioClip={handleRemoveAudioClip}
          />
          </div>
        </div>
        
          {/* Resizable divider - Sidebar */}
          <div 
          ref={sideBarDividerRef}
          className="w-1 bg-editor-border hover:bg-blue-500 cursor-col-resize active:bg-blue-700 transition-colors flex items-center justify-center"
          onMouseDown={handleSidebarDividerMouseDown}
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
