"use client";

import React, { useState, useEffect, useRef } from 'react';

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
  onApplyTrim,
  onExport,
  onResetVideoTrim,
  onResetAudioTrim
}) => {
  const [draggingState, setDraggingState] = useState({
    isDragging: false,
    isVideoTrimStartDragging: false,
    isVideoTrimEndDragging: false,
    isAudioTrimStartDragging: false,
    isAudioTrimEndDragging: false
  });
  
  const [zoom, setZoom] = useState(1);
  const [timeMarkers, setTimeMarkers] = useState<TimeMarker[]>([]);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const videoTrackRef = useRef<HTMLDivElement>(null);
  const audioTrackRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (duration <= 0) return;
    
    const markers: TimeMarker[] = [];
    const interval = duration <= 30 ? 1 : 
                    duration <= 60 ? 5 : 
                    duration <= 300 ? 15 : 30;
    
    for (let time = 0; time <= duration; time += interval) {
      markers.push({
        position: `${(time / duration) * 100}%`,
        label: formatTime(time)
      });
    }
    
    setTimeMarkers(markers);
  }, [duration, zoom]);

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
  
  const handleAudioStartTrim = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = audioTrackRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(0, Math.min(audioTrimEnd - 0.5, clickPosition * duration));
    onAudioTrimStartChange(newTime);
  };
  
  const handleAudioEndTrim = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = audioTrackRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = Math.max(audioTrimStart + 0.5, Math.min(duration, clickPosition * duration));
    onAudioTrimEndChange(newTime);
  };
  
  const handleVideoTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingState.isDragging) {
      const newTime = getTimeFromPosition(e.clientX, videoTrackRef);
      onScrub(newTime);
    }
  };
  
  const handleAudioTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingState.isDragging) {
      const newTime = getTimeFromPosition(e.clientX, audioTrackRef);
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
  const audioClipStartPosition = `${(audioTrimStart / duration) * 100}%`;
  const audioClipWidth = `${((audioTrimEnd - audioTrimStart) / duration) * 100}%`;
  
  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.5, 1));
  };

  const seekToTime = (time: number) => {
    onScrub(Math.max(0, Math.min(duration, time)));
  };
  const seekToVideoStart = () => {
    seekToTime(videoTrimStart);
  };
  
  const seekToVideoEnd = () => {
    seekToTime(videoTrimEnd);
  };
  
  const seekToAudioStart = () => {
    seekToTime(audioTrimStart);
  };
  
  const seekToAudioEnd = () => {
    seekToTime(audioTrimEnd);
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
  
  const setAudioStartToCurrent = () => {
    if (currentTime < audioTrimEnd - 0.5) {
      onAudioTrimStartChange(currentTime);
    }
  };
  
  const setAudioEndToCurrent = () => {
    if (currentTime > audioTrimStart + 0.5) {
      onAudioTrimEndChange(currentTime);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 min-h-[300px] bg-editor-bg">
      {/* Timeline controls */}
      <div className="flex justify-between mb-2">
        <div className="flex gap-2">
          <button 
            onClick={onApplyTrim}
            className="bg-editor-panel text-white border border-editor-border px-3 py-1 rounded hover:bg-editor-highlight"
          >
            Apply Trim
          </button>
          <button 
            onClick={onExport}
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Export Video
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm bg-editor-panel px-2 py-1 rounded border border-editor-border">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleZoomOut}
              className="bg-editor-panel text-white border border-editor-border w-8 rounded hover:bg-editor-highlight"
            >
              -
            </button>
            <button 
              onClick={handleZoomIn}
              className="bg-editor-panel text-white border border-editor-border w-8 rounded hover:bg-editor-highlight"
            >
              +
            </button>
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

      {/* Timeline tracks */}
      <div 
        ref={timelineRef}
        className="flex-1 flex flex-col gap-4"
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
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                Set Start
              </button>
              <button 
                onClick={setVideoEndToCurrent}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                Set End
              </button>
              <button 
                onClick={onResetVideoTrim}
                className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                title="Reset video trim points to the full duration"
              >
                Reset Trim
              </button>
              <div className="border-r border-gray-600 mx-2 h-6"></div>
              <button 
                onClick={seekToVideoStart}
                className="text-xs bg-editor-panel text-white border border-editor-border px-2 py-1 rounded hover:bg-editor-highlight"
              >
                Go to Start
              </button>
              <button 
                onClick={seekToVideoEnd}
                className="text-xs bg-editor-panel text-white border border-editor-border px-2 py-1 rounded hover:bg-editor-highlight"
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
                className="absolute top-0 h-full w-[2px] bg-red-500 z-10"
                style={{ left: scrubberPosition }}
              />
              
              {/* Video clip */}
              <div 
                className="absolute h-[80%] top-[10%] bg-editor-highlight rounded group cursor-move"
                style={{ 
                  left: videoClipStartPosition, 
                  width: videoClipWidth,
                  transform: zoom > 1 ? `scaleX(${zoom})` : 'none',
                  transformOrigin: 'left'
                }}
              >
                {/* Professional trim handles like in industry-standard editors */}
                <div 
                  className="absolute left-0 top-0 h-full w-4 bg-blue-500 bg-opacity-70 cursor-e-resize hover:bg-opacity-100 flex items-center justify-center group transition-all duration-150" 
                  onMouseDown={handleVideoStartTrim}
                  onDoubleClick={seekToVideoStart}
                  title="Drag to adjust start point | Double-click to seek"
                >
                  <div className="h-10 w-1 bg-white"></div>
                  <div className="absolute -left-1 text-xs text-white opacity-0 group-hover:opacity-100 whitespace-nowrap transform -rotate-90 origin-center">
                    {formatTime(videoTrimStart)}
                  </div>
                </div>
                <div 
                  className="absolute right-0 top-0 h-full w-4 bg-blue-500 bg-opacity-70 cursor-w-resize hover:bg-opacity-100 flex items-center justify-center group transition-all duration-150" 
                  onMouseDown={handleVideoEndTrim}
                  onDoubleClick={seekToVideoEnd}
                  title="Drag to adjust end point | Double-click to seek"
                >
                  <div className="h-10 w-1 bg-white"></div>
                  <div className="absolute -right-1 text-xs text-white opacity-0 group-hover:opacity-100 whitespace-nowrap transform -rotate-90 origin-center">
                    {formatTime(videoTrimEnd)}
                  </div>
                </div>
                
                {/* Clip label */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold">{formatTime(videoTrimEnd - videoTrimStart)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audio track */}
        <div className="flex flex-col">
          <div className="flex items-center mb-1">
            <div className="w-[120px] flex items-center justify-center text-sm font-medium">
              Audio Layer
            </div>
            <div className="flex gap-2">
              <button 
                onClick={setAudioStartToCurrent}
                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
              >
                Set Start
              </button>
              <button 
                onClick={setAudioEndToCurrent}
                className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
              >
                Set End
              </button>
              <button 
                onClick={onResetAudioTrim}
                className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                title="Reset audio trim points to the full duration"
              >
                Reset Trim
              </button>
              <div className="border-r border-gray-600 mx-2 h-6"></div>
              <button 
                onClick={seekToAudioStart}
                className="text-xs bg-editor-panel text-white border border-editor-border px-2 py-1 rounded hover:bg-editor-highlight"
              >
                Go to Start
              </button>
              <button 
                onClick={seekToAudioEnd}
                className="text-xs bg-editor-panel text-white border border-editor-border px-2 py-1 rounded hover:bg-editor-highlight"
              >
                Go to End
              </button>
            </div>
          </div>
          <div className="flex h-12 bg-editor-panel border border-editor-border rounded">
            <div className="w-[120px] flex items-center justify-center bg-editor-panel border-r border-editor-border text-sm">
              Audio
            </div>
            <div 
              ref={audioTrackRef}
              className="flex-1 relative overflow-hidden"
              onMouseDown={(e) => handleTrackMouseDown(e, audioTrackRef)}
              onMouseMove={handleAudioTrackMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {/* Scrubber */}
              <div 
                className="absolute top-0 h-full w-[2px] bg-red-500 z-10"
                style={{ left: scrubberPosition }}
              />
              
              {/* Audio clip */}
              <div 
                className="absolute h-[80%] top-[10%] bg-editor-audio rounded group cursor-move"
                style={{ 
                  left: audioClipStartPosition, 
                  width: audioClipWidth,
                  transform: zoom > 1 ? `scaleX(${zoom})` : 'none',
                  transformOrigin: 'left'
                }}
              >
                {/* Waveform visualization (simulated) */}
                <div className="absolute inset-0 flex items-center justify-around px-2">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-[2px] bg-white bg-opacity-30" 
                      style={{ height: `${30 + (i % 5) * 10}%` }}
                    />
                  ))}
                </div>
                
                {/* Professional trim handles like in industry-standard editors */}
                <div 
                  className="absolute left-0 top-0 h-full w-4 bg-green-500 bg-opacity-70 cursor-e-resize hover:bg-opacity-100 flex items-center justify-center group transition-all duration-150" 
                  onMouseDown={handleAudioStartTrim}
                  onDoubleClick={seekToAudioStart}
                  title="Drag to adjust audio start point | Double-click to seek"
                >
                  <div className="h-10 w-1 bg-white"></div>
                  <div className="absolute -left-1 text-xs text-white opacity-0 group-hover:opacity-100 whitespace-nowrap transform -rotate-90 origin-center">
                    {formatTime(audioTrimStart)}
                  </div>
                </div>
                <div 
                  className="absolute right-0 top-0 h-full w-4 bg-green-500 bg-opacity-70 cursor-w-resize hover:bg-opacity-100 flex items-center justify-center group transition-all duration-150" 
                  onMouseDown={handleAudioEndTrim}
                  onDoubleClick={seekToAudioEnd}
                  title="Drag to adjust audio end point | Double-click to seek"
                >
                  <div className="h-10 w-1 bg-white"></div>
                  <div className="absolute -right-1 text-xs text-white opacity-0 group-hover:opacity-100 whitespace-nowrap transform -rotate-90 origin-center">
                    {formatTime(audioTrimEnd)}
                  </div>
                </div>
                
                {/* Clip label */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-bold">{formatTime(audioTrimEnd - audioTrimStart)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
