"use client";

import React, { useState, useEffect, useRef } from 'react';
import AudioManager, { AudioClip } from './AudioManager';

interface TimelineProps {
  currentTime: number;
  duration: number;
  videoTrimStart: number;
  videoTrimEnd: number;
  audioTrimStart: number;
  audioTrimEnd: number;
  onScrub: (time: number) => void;
  onVideoTrimStartChange: (time: number) => void;
  onVideoTrimEndChange: (time: number) => void;
  onAudioTrimStartChange: (time: number) => void;
  onAudioTrimEndChange: (time: number) => void;
  onApplyTrim: () => void;
  onExport: () => void;
  onResetVideoTrim: () => void;
  onResetAudioTrim: () => void;
  sidebarWidth?: number;
  isExporting?: boolean;
  onAddAudioClip?: (clip: AudioClip) => void;
  onRemoveAudioClip?: (clipId: string) => void;
  audioClips?: AudioClip[];
}

interface TimeMarker {
  position: string;
  label: string;
}

const Timeline: React.FC<TimelineProps> = ({
  currentTime,
  duration,
  videoTrimStart,
  videoTrimEnd,
  audioTrimStart,
  audioTrimEnd,
  onScrub,
  onVideoTrimStartChange,
  onVideoTrimEndChange,
  onAudioTrimStartChange,
  onAudioTrimEndChange,
  onExport,
  onResetVideoTrim,
  sidebarWidth = 240,
  isExporting = false,
  onAddAudioClip,
  onRemoveAudioClip,
  audioClips = []
}) => {
  const [draggingState, setDraggingState] = useState({
    isDragging: false,
    isVideoTrimStartDragging: false,
    isVideoTrimEndDragging: false,
    isAudioTrimStartDragging: false,
    isAudioTrimEndDragging: false
  });
  
  const [timeMarkers, setTimeMarkers] = useState<TimeMarker[]>([]);
  const [showAudioManager, setShowAudioManager] = useState(false);
  const [selectedAudioClip, setSelectedAudioClip] = useState<string | null>(null);
  const [draggingAudioClip, setDraggingAudioClip] = useState<{ id: string; initialX: number; initialStartTime: number } | null>(null);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const videoTrackRef = useRef<HTMLDivElement>(null);
  const audioTrackRef = useRef<HTMLDivElement>(null);
  
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const audioElementsRef = useRef<{[key: string]: HTMLAudioElement}>({});

  useEffect(() => {
    if (duration <= 0) return;
    
    const timelineWidth = timelineRef.current?.clientWidth || window.innerWidth;
    const availableWidth = timelineWidth - 240;
    
    const targetMarkerCount = Math.max(5, Math.floor(availableWidth / 70));
    const idealInterval = duration / targetMarkerCount;
    
    let interval;
    if (idealInterval <= 1) interval = 1;
    else if (idealInterval <= 2) interval = 2;
    else if (idealInterval <= 5) interval = 5;
    else if (idealInterval <= 10) interval = 10;
    else if (idealInterval <= 15) interval = 15;
    else if (idealInterval <= 30) interval = 30;
    else if (idealInterval <= 60) interval = 60;
    else interval = Math.ceil(idealInterval / 60) * 60;
    
    const markers: TimeMarker[] = [];
    for (let time = 0; time <= duration; time += interval) {
      markers.push({
        position: `${(time / duration) * 100}%`,
        label: formatTime(time)
      });
    }
    
    setTimeMarkers(markers);
  }, [duration, sidebarWidth]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeFromPosition = (clientX: number, trackRef: React.RefObject<HTMLDivElement | null>): number => {
    if (!trackRef.current) return 0;
    
    const rect = trackRef.current.getBoundingClientRect();
    const clickPosition = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(duration, clickPosition * duration));
  };

  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>, trackRef: React.RefObject<HTMLDivElement | null>) => {
    if (e.button !== 0) return;
    
    setDraggingState({ ...draggingState, isDragging: true });
    onScrub(getTimeFromPosition(e.clientX, trackRef));
  };

  const handleVideoStartTrim = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = videoTrackRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(videoTrimEnd - 0.5, clickPosition * duration));
    onVideoTrimStartChange(newTime);
  };
  
  const handleVideoEndTrim = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = videoTrackRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(videoTrimStart + 0.5, Math.min(duration, clickPosition * duration));
    onVideoTrimEndChange(newTime);
  };
  
  const handleVideoTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingState.isDragging) {
      const newTime = getTimeFromPosition(e.clientX, videoTrackRef);
      onScrub(newTime);
    }
  };
  
  const handleMouseUp = () => {
    setDraggingState({
      isDragging: false,
      isVideoTrimStartDragging: false,
      isVideoTrimEndDragging: false,
      isAudioTrimStartDragging: false,
      isAudioTrimEndDragging: false
    });
  };
  
  const handleMouseLeave = () => {
    setDraggingState({
      isDragging: false,
      isVideoTrimStartDragging: false,
      isVideoTrimEndDragging: false,
      isAudioTrimStartDragging: false,
      isAudioTrimEndDragging: false
    });
  };
  
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (duration > 0) {
        const timelineWidth = timelineRef.current?.clientWidth || window.innerWidth;
        const availableWidth = timelineWidth - 240;
        
        const targetMarkerCount = Math.max(5, Math.floor(availableWidth / 70));
        const idealInterval = duration / targetMarkerCount;
        
        let interval;
        if (idealInterval <= 1) interval = 1;
        else if (idealInterval <= 2) interval = 2;
        else if (idealInterval <= 5) interval = 5;
        else if (idealInterval <= 10) interval = 10;
        else if (idealInterval <= 15) interval = 15;
        else if (idealInterval <= 30) interval = 30;
        else if (idealInterval <= 60) interval = 60;
        else interval = Math.ceil(idealInterval / 60) * 60;
        
        const markers: TimeMarker[] = [];
        for (let time = 0; time <= duration; time += interval) {
          markers.push({
            position: `${(time / duration) * 100}%`,
            label: formatTime(time)
          });
        }
        
        setTimeMarkers(markers);
      }
    });
    
    if (timelineRef.current) {
      resizeObserver.observe(timelineRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [duration]);

  useEffect(() => {
    if (!draggingAudioClip || !audioTrackRef.current || !onAddAudioClip) return;
    
    const initialX = draggingAudioClip.initialX;
    const initialStartTime = draggingAudioClip.initialStartTime;
    const trackRect = audioTrackRef.current.getBoundingClientRect();
    
    const pixelsPerSecond = trackRect.width / duration;
    
    let animationFrameId: number | null = null;
    
    const handleAudioClipDrag = (e: MouseEvent) => {
      e.preventDefault();
      
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        const totalDeltaX = e.clientX - initialX;
        
        const deltaTime = totalDeltaX / pixelsPerSecond;
        
        const clipToUpdate = audioClips?.find(clip => clip.id === draggingAudioClip.id);
        if (!clipToUpdate) return;
        
        const newStartTime = Math.max(0, Math.min(
          duration - clipToUpdate.duration, 
          initialStartTime + deltaTime
        ));
        
        
        if (newStartTime !== clipToUpdate.startTime) {
          const updatedClip = {
            ...clipToUpdate,
            startTime: newStartTime
          };
          
          if (onAddAudioClip) {
            onAddAudioClip(updatedClip);
          }
        }
        
      });
    };
    
    const handleAudioClipDragEnd = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      setDraggingAudioClip(null);
    };
    
    document.addEventListener('mousemove', handleAudioClipDrag);
    document.addEventListener('mouseup', handleAudioClipDragEnd);
    
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener('mousemove', handleAudioClipDrag);
      document.removeEventListener('mouseup', handleAudioClipDragEnd);
    };
  }, [draggingAudioClip, duration, audioClips, onAddAudioClip]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (draggingState.isVideoTrimStartDragging && videoTrackRef.current) {
        const rect = videoTrackRef.current.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(duration, clickPosition * duration));
        
        if (newTime < videoTrimEnd - 0.5) {
          onVideoTrimStartChange(newTime);
        }
      } else if (draggingState.isVideoTrimEndDragging && videoTrackRef.current) {
        const rect = videoTrackRef.current.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(duration, clickPosition * duration));
        
        if (newTime > videoTrimStart + 0.5) {
          onVideoTrimEndChange(newTime);
        }
      } else if (draggingState.isAudioTrimStartDragging && audioTrackRef.current) {
        const rect = audioTrackRef.current.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(duration, clickPosition * duration));
        
        if (newTime < audioTrimEnd - 0.5) {
          onAudioTrimStartChange(newTime);
        }
      } else if (draggingState.isAudioTrimEndDragging && audioTrackRef.current) {
        const rect = audioTrackRef.current.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const newTime = Math.max(0, Math.min(duration, clickPosition * duration));
        
        if (newTime > audioTrimStart + 0.5) {
          onAudioTrimEndChange(newTime);
        }
      }
    };
    
    const handleGlobalMouseUp = () => {
      setDraggingState({
        isDragging: false,
        isVideoTrimStartDragging: false,
        isVideoTrimEndDragging: false,
        isAudioTrimStartDragging: false,
        isAudioTrimEndDragging: false
      });
    };
    
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingState, videoTrimStart, videoTrimEnd, audioTrimStart, audioTrimEnd, duration, onVideoTrimStartChange, onVideoTrimEndChange, onAudioTrimStartChange, onAudioTrimEndChange]);

  const scrubberPosition = `${(currentTime / duration) * 100}%`;
  const videoClipStartPosition = `${(videoTrimStart / duration) * 100}%`;
  const videoClipWidth = `${((videoTrimEnd - videoTrimStart) / duration) * 100}%`;
  
  const seekToTime = (time: number) => {
    onScrub(Math.max(0, Math.min(duration, time)));
  };
  const seekToVideoStart = () => {
    seekToTime(videoTrimStart);
  };
  
  const seekToVideoEnd = () => {
    seekToTime(videoTrimEnd);
  };
  
  const setVideoStartToCurrent = () => {
    if (currentTime < videoTrimEnd - 0.5) {
      onVideoTrimStartChange(currentTime);
    }
  };
  
  const setVideoEndToCurrent = () => {
    if (currentTime > videoTrimStart + 0.5) {
      onVideoTrimEndChange(currentTime);
    }
  };

  const handleAudioTrackClick = (e: React.MouseEvent) => {
    const rect = audioTrackRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(audioTrimEnd - 0.5, clickPosition * duration));
    onAudioTrimStartChange(newTime);
  };

  const handleAddAudioClick = () => {
    setShowAudioManager(true);
  };

  const renderExportButton = () => {
    return (
      <button
        className={`px-3 py-1 text-sm rounded ${isExporting ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'}`}
        onClick={onExport}
        disabled={isExporting}
      >
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
    );
  };

  const handleAudioClipClick = (clip: AudioClip) => {
    if (onAddAudioClip) {
      onAddAudioClip(clip);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 min-h-[300px] bg-editor-bg select-none">
      {/* Timeline controls */}
      <div className="flex justify-between mb-2">
        <div className="flex gap-2">
          {renderExportButton()}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm bg-editor-panel px-2 py-1 rounded border border-editor-border select-none">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      {/* Timeline ruler with markers */}
      <div className="h-12 relative bg-editor-panel border border-editor-border rounded mb-2 overflow-hidden">
        {timeMarkers.map((marker, index) => (
          <div key={index} className="absolute h-full" style={{ left: marker.position }}>
            <div className="h-1/2 border-l border-editor-border"></div>
            <div className="text-xs text-gray-400 absolute -ml-4 whitespace-nowrap">{marker.label}</div>
          </div>
        ))}
        {/* Ruler scrubber */}
        <div 
          className="absolute top-0 h-full w-[2px] bg-red-500 z-10"
          style={{ left: scrubberPosition }}
        />
      </div>

      {/* Timeline tracks - scrollable container */}
      <div 
        ref={timelineRef}
        className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-250px)]"
      >
        {/* Video track */}
        <div className="flex flex-col">
          <div className="flex items-center mb-1">
            <div className="w-[120px] flex items-center justify-center text-sm font-medium">
              Video Layer
            </div>
            <div className="flex gap-2">
              <button 
                onClick={setVideoStartToCurrent}
                className="text-xs bg-purple-900 text-white px-2 py-1 rounded hover:bg-purple-900 cursor-pointer"
              >
                Set Start
              </button>
              <button 
                onClick={setVideoEndToCurrent}
                className="text-xs bg-purple-900 text-white px-2 py-1 rounded hover:bg-purple-900 cursor-pointer"
              >
                Set End
              </button>
              <button 
                onClick={onResetVideoTrim}
                className="text-xs text-white border px-2 py-1 rounded cursor-pointer"
                title="Reset video trim points to the full duration"
              >
                Reset Trim
              </button>
              <div className="border-r border-gray-600 mx-2 h-6"></div>
              <button 
                onClick={seekToVideoStart}
                className="text-xs bg-editor-panel text-white border border-editor-border px-2 py-1 rounded hover:bg-editor-highlight cursor-pointer"
              >
                Go to Start
              </button>
              <button 
                onClick={seekToVideoEnd}
                className="text-xs bg-editor-panel text-white border border-editor-border px-2 py-1 rounded hover:bg-editor-highlight cursor-pointer"
              >
                Go to End
              </button>
            </div>
          </div>
          <div className="flex h-12 bg-editor-panel border border-editor-border rounded">
            <div className="w-[120px] flex items-center justify-center bg-editor-panel border-r border-editor-border text-sm">
              Video
            </div>
            <div 
              ref={videoTrackRef}
              className="flex-1 relative overflow-hidden"
              onMouseDown={(e) => handleTrackMouseDown(e, videoTrackRef)}
              onMouseMove={handleVideoTrackMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {/* Scrubber */}
              <div 
                className="absolute top-0 h-[90%] mt-0.5 w-[5px] rounded-full bg-red-500 z-10"
                style={{ left: scrubberPosition }}
              />
              
              {/* Video clip */}
              <div 
                className="absolute h-[80%] top-[10%] bg-editor-highlight rounded group cursor-move select-none"
                style={{ 
                  left: videoClipStartPosition, 
                  width: videoClipWidth,
                  transformOrigin: 'left'
                }}
              >
                {/* Trim handles */}
                <div 
                  className="absolute left-0 top-0 h-full w-4 bg-blue-500 bg-opacity-70 cursor-e-resize hover:bg-opacity-100 flex items-center justify-center group transition-all duration-150 select-none" 
                  onMouseDown={handleVideoStartTrim}
                  onDoubleClick={seekToVideoStart}
                  title="Drag to adjust start point | Double-click to seek"
                >
                  <div className="h-10 w-1 bg-white"></div>
                  <div className="absolute -left-1 text-xs text-white opacity-0 group-hover:opacity-100 whitespace-nowrap transform -rotate-90 origin-center select-none">
                    {formatTime(videoTrimStart)}
                  </div>
                </div>
                <div 
                  className="absolute right-0 top-0 h-full w-4 bg-blue-500 bg-opacity-70 cursor-w-resize hover:bg-opacity-100 flex items-center justify-center group transition-all duration-150 select-none" 
                  onMouseDown={handleVideoEndTrim}
                  onDoubleClick={seekToVideoEnd}
                  title="Drag to adjust end point | Double-click to seek"
                >
                  <div className="h-10 w-1 bg-white"></div>
                  <div className="absolute -right-1 text-xs text-white opacity-0 group-hover:opacity-100 whitespace-nowrap transform -rotate-90 origin-center select-none">
                    {formatTime(videoTrimEnd)}
                  </div>
                </div>
                
                {/* Clip label */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold select-none">{formatTime(videoTrimEnd - videoTrimStart)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audio tracks */}
        <div className="flex flex-col">
          <div className="flex items-center mb-2">
            <div className="w-[120px] flex items-center justify-center text-sm font-medium">
              Added Audio
            </div>
            <div className="border-r border-gray-600 mr-4 h-6"></div>
            <div className="flex gap-2">
              <button 
                onClick={handleAddAudioClick}
                className="text-xs bg-green-800 text-white px-2 py-1 rounded hover:bg-green-700 flex items-center gap-1 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                Add Audio
              </button>
              
              
              {/* <button 
                onClick={setAudioStartToCurrent}
                className="text-xs bg-editor-panel text-white border border-editor-border px-2 py-1 rounded hover:bg-editor-highlight cursor-pointer"
              >
                Set Audio Start
              </button>
              <button 
                onClick={setAudioEndToCurrent}
                className="text-xs bg-editor-panel text-white border border-editor-border px-2 py-1 rounded hover:bg-editor-highlight cursor-pointer"
              >
                Set Audio End
              </button>
              <button 
                onClick={onResetAudioTrim}
                className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 cursor-pointer"
                title="Reset audio trim points to the full duration"
              >
                Reset Audio Trim
              </button> */}
            </div>
          </div>
                    
          {/* User audio clips */}
          {audioClips && audioClips.length > 0 && (
            <div className="space-y-2" ref={audioTrackRef}>
              {audioClips.map((clip) => {
                const clipStartPosition = `${(clip.startTime / duration) * 100}%`;
                
                const clipWidth = `${(clip.duration / duration) * 100}%`;
                const isSelected = selectedAudioClip === clip.id;
                
                return (
                  <div key={clip.id} className="flex h-12 bg-editor-panel border border-editor-border rounded">
                    <div className="w-[120px] flex items-center justify-between bg-editor-panel border-r border-editor-border text-sm px-1 group">
                    <span
                        className="overflow-hidden text-ellipsis whitespace-nowrap"
                        title={clip.name}
                      >
                        {clip.name}
                      </span>
                      <div className="flex gap-1 opacity-100 transition-opacity">
                        <button 
                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                          title={playingClipId === clip.id ? "Pause this clip" : "Play this clip"}
                          onClick={(e) => {
                            e.stopPropagation();
                            
                            if (playingClipId === clip.id) {
                              if (audioElementsRef.current[clip.id]) {
                                audioElementsRef.current[clip.id].pause();
                                delete audioElementsRef.current[clip.id];
                                setPlayingClipId(null);
                              }
                            } else {
                              if (playingClipId && audioElementsRef.current[playingClipId]) {
                                audioElementsRef.current[playingClipId].pause();
                                delete audioElementsRef.current[playingClipId];
                              }
                              
                              const audio = new Audio(clip.url);
                              audioElementsRef.current[clip.id] = audio;
                              
                              audio.onended = () => {
                                setPlayingClipId(null);
                                delete audioElementsRef.current[clip.id];
                              };
                              
                              audio.play();
                              setPlayingClipId(clip.id);
                            }
                          }}
                        >
                          {playingClipId === clip.id ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="currentColor" viewBox="0 0 16 16">
                              <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                            </svg>
                          )}
                        </button>
                        <button 
                          className="bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                          title="Remove this clip"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Delete button clicked for clip:', clip.name);
                            
                            if (confirm(`Remove audio clip "${clip.name}"?`)) {
                              console.log(`User confirmed deletion of audio clip: ${clip.name} (ID: ${clip.id})`);
                              
                              if (audioElementsRef.current[clip.id]) {
                                audioElementsRef.current[clip.id].pause();
                                delete audioElementsRef.current[clip.id];
                              }

                              setSelectedAudioClip(null);
                              
                              if (onRemoveAudioClip) {
                                console.log('Calling onRemoveAudioClip with clip ID:', clip.id);
                                onRemoveAudioClip(clip.id);
                              } else {
                                console.error('onRemoveAudioClip function is not available');
                              }
                            }
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div 
                      className="flex-1 relative overflow-x-auto overflow-y-hidden mx-1"
                      onMouseDown={(e) => handleTrackMouseDown(e, audioTrackRef)}
                      onClick={handleAudioTrackClick}>
                      <div className="min-w-full">
                        {/* Scrubber */}
                        <div 
                          className="absolute top-0 h-[90%] mt-0.5 w-[5px] rounded-full bg-red-500 z-10"
                          style={{ left: scrubberPosition }}
                        />
                        
                        {/* Audio clip */}
                        <div 
                        className={`absolute h-[80%] top-[10%] rounded group cursor-move ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                        style={{ 
                          left: clipStartPosition, 
                          width: clipWidth,
                          backgroundColor: '#6366F1',
                          transformOrigin: 'left'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAudioClip(isSelected ? null : clip.id);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingAudioClip({
                            id: clip.id,
                            initialX: e.clientX,
                            initialStartTime: clip.startTime
                          });
                        }}
                      >
                        {/* Waveform visualization */}
                        <div className="absolute inset-0 flex items-center justify-center gap-1 px-2">
                          {Array.from({ length: 8 }).map((_, i) => {
                            const staticHeight = 40 + ((i * 13) % 40);
                            const isPlaying = playingClipId === clip.id;
                            
                            return (
                              <div 
                                key={i} 
                                className={`w-[3px] bg-white rounded-full transition-all duration-300 ${
                                  isPlaying ? 'bg-opacity-60 animate-pulse' : 'bg-opacity-30'
                                }`}
                                style={{ 
                                  height: isPlaying 
                                    ? `${staticHeight + Math.sin(Date.now() / 200 + i) * 15}%` 
                                    : `${staticHeight}%`,
                                  animationDelay: `${i * 50}ms`,
                                  transition: 'height 0.2s ease-in-out'
                                }}
                              />
                            );
                          })}
                        </div>
                        
                        {/* Clip label */}
                        <div className="absolute hidden group-hover:flex bg-black/60 rounded-sm inset-0 items-center justify-center text-xs font-extrabold text-white">
                          {clip.name}
                        </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Add audio track button */}
          <button 
            onClick={handleAddAudioClick}
            className="mt-2 border border-dashed border-gray-600 rounded h-10 flex items-center justify-center text-gray-400 hover:text-white hover:border-gray-400 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="mr-2">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            Add Audio Track
          </button>
        </div>
        
        {/* Audio Manager Modal */}
        {showAudioManager && (
          <AudioManager
            onAddAudioClip={handleAudioClipClick}
            onClose={() => setShowAudioManager(false)}
            currentTime={currentTime}
            videoDuration={duration}
          />
        )}
      </div>
    </div>
  );
};

export default Timeline;
