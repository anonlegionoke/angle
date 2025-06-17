"use client";

import React, { useState, useEffect } from 'react';

interface VideoPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoSrc: string;
  onMetadataLoaded: () => void;
  onTimeUpdate: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  videoTrimStart: number;
  videoTrimEnd: number;
  isLoopingEnabled: boolean;
  isGenerating: boolean;
  latestPromptId: string;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoRef,
  videoSrc,
  onMetadataLoaded,
  onTimeUpdate,
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
  videoTrimStart,
  videoTrimEnd,
  isLoopingEnabled,
  isGenerating,
  latestPromptId
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  
  useEffect(() => {
    setVideoError(null);
  }, [videoSrc]);
  
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted, videoRef]);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.currentTime < videoTrimStart) {
      video.currentTime = videoTrimStart;
    }
    
    const handleTimeUpdate = () => {
      if (video.currentTime >= videoTrimEnd) {
        if (isLoopingEnabled) {
          video.currentTime = videoTrimStart;
          if (isPlaying) {
            video.play().catch(err => console.error('Error playing video:', err));
          }
        } else {
          video.pause();
          setIsPlaying(false);
          video.currentTime = videoTrimStart;
        }
      }
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef, videoTrimStart, videoTrimEnd, isLoopingEnabled, isPlaying]);
  
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
        setVideoError('Failed to play video. The video might be corrupted or in an unsupported format.');
      });
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    onVolumeChange(newVolume);
  };
  
  const handleVideoError = () => {
    console.error('Video error occurred');
    setVideoError('Failed to load the video. Please check that the file exists and is in a supported format.');
  };

  const [remaining, setRemaining] = useState(180);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval); 
  }, [latestPromptId]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="flex flex-col bg-black border-b border-editor-border justify-center h-full">
      <div className="flex justify-center items-center relative overflow-hidden h-full">
      {isGenerating && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
                <div className="text-white text-center max-w-md">
                  <p>🫕♨️ Prepairing your video...</p>
                  <br />
                  <p>Serving in {minutes} min {seconds} sec</p>
                </div>
              </div>
        )}
        {videoSrc && videoSrc !== 'failed' ? (
              <>
                <video
                  ref={videoRef}
                  className="max-w-full max-h-full object-contain"
                  src={videoSrc}
                  onLoadedMetadata={onMetadataLoaded}
                  onTimeUpdate={onTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onError={handleVideoError}
                  controls={false}
                  playsInline
                  preload="auto"
                  autoPlay={false}
                >
                  <source src={videoSrc} type="video/mp4" />
                </video>

                {videoError && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4">
                    <div className="text-red-400 text-center max-w-md">
                      <button 
                        onClick={() => window.open(videoSrc, '_blank')}
                        className="mt-3 px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-white text-sm"
                      >
                        Open in new window
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : videoSrc === 'failed' ? (
              <p>⚠️ Failed to render. Please try again with a different prompt.</p>
            ) : (
              <div className="flex flex-col items-center justify-center w-full bg-editor-panel rounded">
                <span className="text-xl mb-4">ANGLE VIDEO</span>
                <p className="text-gray-400">{!videoSrc ? 'Enter a prompt to generate a video' : 'Loading...'}</p>
                <div className="text-sm text-gray-500 mt-4 max-w-md text-center px-4">
                  <p className="mb-2">Generate presentation videos using AI.</p>
                  <p className="mb-4">Try prompts like:</p>
                  <ul className="text-left list-disc pl-8 space-y-1">
                    <li>"Show the Pythagorean theorem"</li>
                    <li>"Visualize an ellipse"</li>
                    <li>"Transform a square to a circle"</li>
                  </ul>
                </div>
              </div>
)}
      </div>
      
      {/* Custom video controls */}
      {videoSrc && !videoError && (
        <div className="flex items-center bg-editor-panel p-2 gap-4">
          <button 
            onClick={togglePlayPause}
            className="w-8 h-8 flex items-center justify-center bg-editor-highlight rounded hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
              </svg>
            )}
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            {/* Loop toggle button */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-300">Loop:</span>
              <button 
                className={`px-2 py-1 text-xs rounded ${isLoopingEnabled ? 'bg-blue-600 text-white' : 'bg-editor-panel text-gray-300 border border-editor-border'}`}
                title={isLoopingEnabled ? 'Disable loop playback' : 'Enable loop playback'}
                onClick={() => {
                  const event = new CustomEvent('toggleloop');
                  window.dispatchEvent(event);
                }}
              >
                {isLoopingEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {/* Volume controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={onMuteToggle}
                className="w-8 h-8 flex items-center justify-center bg-editor-panel rounded hover:bg-editor-highlight transition-colors"
              >
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06zm7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.647a.5.5 0 0 1 .708 0z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
                    <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
                    <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
                  </svg>
                )}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={volume} 
                onChange={handleVolumeChange}
                className="w-24 accent-white"
                disabled={isMuted}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;
