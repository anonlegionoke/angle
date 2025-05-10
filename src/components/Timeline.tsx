"use client";

import React, { useState, useEffect, useRef } from 'react';

interface TimelineProps {
  currentTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  onScrub: (time: number) => void;
  onTrimStart: () => void;
  onTrimEnd: () => void;
}

interface TimeMarker {
  position: string;
  label: string;
}

const Timeline: React.FC<TimelineProps> = ({
  currentTime,
  duration,
  trimStart,
  trimEnd,
  onScrub,
  onTrimStart,
  onTrimEnd
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [timeMarkers, setTimeMarkers] = useState<TimeMarker[]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Generate time markers based on duration and zoom
  useEffect(() => {
    if (duration <= 0) return;
    
    const markers: TimeMarker[] = [];
    // Determine marker interval based on duration and zoom
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

  // Format time as MM:SS
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle timeline click/drag
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * duration;
    onScrub(newTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    handleTimelineClick(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleTimelineClick(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Calculate positions
  const scrubberPosition = `${(currentTime / duration) * 100}%`;
  const clipStartPosition = `${(trimStart / duration) * 100}%`;
  const clipWidth = `${((trimEnd - trimStart) / duration) * 100}%`;

  // Handle zoom
  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.5, 1));
  };

  // Apply trim
  const handleApplyTrim = () => {
    // In a real app, this would send a request to trim the video
    // For now, we'll just log it
    console.log(`Applying trim from ${formatTime(trimStart)} to ${formatTime(trimEnd)}`);
  };

  return (
    <div className="flex-1 flex flex-col p-4 min-h-[200px] bg-editor-bg">
      {/* Timeline controls */}
      <div className="flex justify-between mb-2">
        <div className="flex gap-2">
          <button 
            onClick={onTrimStart}
            className="bg-editor-panel text-white border border-editor-border px-3 py-1 rounded hover:bg-editor-highlight"
          >
            Set Start
          </button>
          <button 
            onClick={onTrimEnd}
            className="bg-editor-panel text-white border border-editor-border px-3 py-1 rounded hover:bg-editor-highlight"
          >
            Set End
          </button>
          <button 
            onClick={handleApplyTrim}
            className="bg-editor-panel text-white border border-editor-border px-3 py-1 rounded hover:bg-editor-highlight"
          >
            Apply Trim
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
      <div className="h-6 relative bg-editor-panel border border-editor-border rounded mb-2 overflow-hidden">
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
        className="flex-1 flex flex-col gap-2"
      >
        {/* Video track */}
        <div className="flex h-12 bg-editor-panel border border-editor-border rounded">
          <div className="w-[120px] flex items-center justify-center bg-editor-panel border-r border-editor-border text-sm">
            Video Layer
          </div>
          <div 
            className="flex-1 relative overflow-hidden"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
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
                left: clipStartPosition, 
                width: clipWidth,
                transform: zoom > 1 ? `scaleX(${zoom})` : 'none',
                transformOrigin: 'left'
              }}
            >
              {/* Trim handles */}
              <div className="absolute left-0 top-0 h-full w-2 bg-white bg-opacity-30 cursor-e-resize hover:bg-opacity-50" />
              <div className="absolute right-0 top-0 h-full w-2 bg-white bg-opacity-30 cursor-w-resize hover:bg-opacity-50" />
              
              {/* Clip label */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs font-bold">{formatTime(trimEnd - trimStart)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Audio track */}
        <div className="flex h-12 bg-editor-panel border border-editor-border rounded">
          <div className="w-[120px] flex items-center justify-center bg-editor-panel border-r border-editor-border text-sm">
            Audio Layer
          </div>
          <div className="flex-1 relative overflow-hidden">
            {/* Audio clip */}
            <div 
              className="absolute h-[80%] top-[10%] bg-editor-audio rounded group cursor-move"
              style={{ 
                left: clipStartPosition, 
                width: clipWidth,
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
              
              {/* Trim handles */}
              <div className="absolute left-0 top-0 h-full w-2 bg-white bg-opacity-30 cursor-e-resize hover:bg-opacity-50" />
              <div className="absolute right-0 top-0 h-full w-2 bg-white bg-opacity-30 cursor-w-resize hover:bg-opacity-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
