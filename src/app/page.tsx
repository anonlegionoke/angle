"use client";

import { useState, useRef, useEffect } from "react";
import VideoPreview from "@/components/VideoPreview";
import Timeline from "@/components/Timeline";
import PromptSidebar from "@/components/PromptSidebar";

export default function Home() {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [videoSrc, setVideoSrc] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setTrimEnd(videoDuration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };
  
  useEffect(() => {
    setVideoSrc("/placeholder_video.mp4");
    
    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', handleMetadataLoaded);
      videoRef.current.addEventListener('timeupdate', handleTimeUpdate);
    }
    
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', handleMetadataLoaded);
        videoRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [handleMetadataLoaded, handleTimeUpdate]);

  const handleScrub = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleTrimStart = () => {
    setTrimStart(currentTime);
  };

  const handleTrimEnd = () => {
    setTrimEnd(currentTime);
  };

  const handlePromptSubmit = async (videoPath: string) => {
    setIsGenerating(true);
    
    try {
      setVideoSrc(videoPath);
      
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error updating video:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-editor-bg text-white font-mono">
      <header className="p-4 text-center border-b border-editor-border">
        <h1 className="text-xl">Angle - AI Video Editor/Generator</h1>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Main workspace */}
        <div className="flex flex-col flex-1 border-r border-editor-border">
          {/* Video preview */}
          <VideoPreview 
            videoRef={videoRef}
            videoSrc={videoSrc}
            onMetadataLoaded={handleMetadataLoaded}
            onTimeUpdate={handleTimeUpdate}
          />

          {/* Timeline */}
          <Timeline 
            currentTime={currentTime}
            duration={duration}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onScrub={handleScrub}
            onTrimStart={handleTrimStart}
            onTrimEnd={handleTrimEnd}
          />
        </div>

        {/* Sidebar */}
        <PromptSidebar 
          onPromptSubmit={handlePromptSubmit}
          isGenerating={isGenerating}
        />
      </main>
    </div>
  );
}
