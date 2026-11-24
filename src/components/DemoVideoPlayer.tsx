"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw,
  Maximize,
  Minimize
} from "lucide-react";

interface DemoVideoPlayerProps {
  className?: string;
  autoPlayOnVisible?: boolean;
}

export function DemoVideoPlayer({ 
  className = "",
  autoPlayOnVisible = true 
}: DemoVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Dragging and zero-reflow tracking refs
  const isDraggingRef = useRef(false);
  const wasPlayingRef = useRef(false);
  const scrubberRectRef = useRef<DOMRect | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // Default to 1x speed
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number>(16.72); // Known asset duration (16.72s)
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [showControls, setShowControls] = useState(false); // Hidden by default
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hasUserPaused, setHasUserPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Controls auto-hide timer management (1 second auto-hide)
  const clearControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  }, []);

  const resetControlsTimeout = useCallback((delay = 1000) => {
    clearControlsTimeout();
    if (!isDraggingRef.current) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, delay);
    }
  }, [clearControlsTimeout]);

  // Declarative auto-hide: 1 second after controls become visible
  useEffect(() => {
    if (showControls && !isDragging) {
      resetControlsTimeout(1000);
      return () => clearControlsTimeout();
    }
  }, [showControls, isDragging, resetControlsTimeout, clearControlsTimeout]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      clearControlsTimeout();
    };
  }, [clearControlsTimeout]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Apply playback speed to video element
  const applySpeed = useCallback((speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      videoRef.current.defaultPlaybackRate = speed;
    }
  }, []);

  // Robust metadata & duration synchronization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncMetadata = () => {
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
      applySpeed(playbackSpeed);
    };

    if (video.readyState >= 1 && video.duration) {
      syncMetadata();
    }

    video.addEventListener("loadedmetadata", syncMetadata);
    video.addEventListener("durationchange", syncMetadata);
    video.addEventListener("canplay", syncMetadata);
    video.addEventListener("play", syncMetadata);

    return () => {
      video.removeEventListener("loadedmetadata", syncMetadata);
      video.removeEventListener("durationchange", syncMetadata);
      video.removeEventListener("canplay", syncMetadata);
      video.removeEventListener("play", syncMetadata);
    };
  }, [applySpeed, playbackSpeed]);

  // Update speed state & video rate
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    applySpeed(speed);
    if (showControls && !isDragging) {
      resetControlsTimeout(1000);
    }
  };

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      applySpeed(playbackSpeed);
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setHasUserPaused(false);
      }).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setHasUserPaused(true);
    }
  }, [playbackSpeed, applySpeed]);

  // Restart video
  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    applySpeed(playbackSpeed);
    videoRef.current.play().then(() => {
      setIsPlaying(true);
      setHasUserPaused(false);
      setShowControls(true);
    }).catch(() => {});
  };

  // Toggle fullscreen
  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Auto-play when scrolled into view
  useEffect(() => {
    if (!autoPlayOnVisible) return;
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !hasUserPaused) {
          if (videoRef.current && videoRef.current.paused) {
            applySpeed(playbackSpeed);
            videoRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {});
          }
        } else if (!entry.isIntersecting) {
          if (videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(currentContainer);
    return () => {
      observer.disconnect();
    };
  }, [autoPlayOnVisible, hasUserPaused, playbackSpeed, applySpeed]);

  // Time and buffer progress updates
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || isDraggingRef.current) return;
    setCurrentTime(video.currentTime);

    // Calculate downloaded buffer range
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const totalDuration = (duration > 0 && isFinite(duration))
        ? duration
        : (video.duration && !isNaN(video.duration) && isFinite(video.duration) ? video.duration : 16.72);
      if (totalDuration > 0) {
        setBufferedPercent(Math.min(100, (bufferedEnd / totalDuration) * 100));
      }
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.duration && !isNaN(video.duration) && isFinite(video.duration) && video.duration > 0) {
      setDuration(video.duration);
    }
    applySpeed(playbackSpeed);
  };

  // High-performance seek calculation utilizing Pointer Events and cached rect (zero forced reflows)
  const seekFromPointer = useCallback((clientX: number) => {
    const video = videoRef.current;
    if (!video) return;

    const totalDuration = (duration > 0 && isFinite(duration))
      ? duration
      : (video.duration && !isNaN(video.duration) && isFinite(video.duration) ? video.duration : 16.72);

    if (totalDuration <= 0) return;

    const rect = scrubberRectRef.current || scrubberRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;

    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = ratio * totalDuration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const totalDuration = (duration > 0 && isFinite(duration))
      ? duration
      : (video.duration && !isNaN(video.duration) && isFinite(video.duration) ? video.duration : 16.72);

    if (totalDuration <= 0) return;

    e.stopPropagation();

    // Capture pointer so dragging anywhere on the screen continues seeking
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    isDraggingRef.current = true;
    setIsDragging(true);
    setShowControls(true);
    clearControlsTimeout();
    wasPlayingRef.current = !video.paused;

    if (wasPlayingRef.current) {
      video.pause();
    }

    // Cache the bounding rect once at gesture start (prevents layout thrashing on drag)
    scrubberRectRef.current = e.currentTarget.getBoundingClientRect();
    seekFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const totalDuration = (duration > 0 && isFinite(duration))
      ? duration
      : (video?.duration && !isNaN(video.duration) && isFinite(video.duration) ? video.duration : 16.72);

    if (isDraggingRef.current) {
      seekFromPointer(e.clientX);
    }

    // Hover tooltip calculation
    const rect = scrubberRectRef.current || e.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && totalDuration > 0) {
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setHoverPosition(ratio * 100);
      setHoverTime(ratio * totalDuration);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      scrubberRectRef.current = null;

      // Resume playing if it was active before dragging started
      if (wasPlayingRef.current && videoRef.current) {
        applySpeed(playbackSpeed);
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      }
      resetControlsTimeout(1000);
    }
  };

  const handlePointerLeave = () => {
    if (!isDraggingRef.current) {
      scrubberRectRef.current = null;
      setHoverTime(null);
      setHoverPosition(null);
    }
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const totalDuration = (duration > 0 && isFinite(duration))
      ? duration
      : (video.duration && !isNaN(video.duration) && isFinite(video.duration) ? video.duration : 16.72);

    if (totalDuration <= 0) return;

    let newTime = currentTime;
    if (e.key === "ArrowLeft") {
      newTime = Math.max(0, currentTime - 5);
    } else if (e.key === "ArrowRight") {
      newTime = Math.min(totalDuration, currentTime + 5);
    } else if (e.key === "Home") {
      newTime = 0;
    } else if (e.key === "End") {
      newTime = totalDuration;
    } else {
      return;
    }
    e.preventDefault();
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Auto-hide controls when user is inactive (1s inactivity timeout)
  const handleMouseMove = () => {
    if (showControls && !isDragging) {
      resetControlsTimeout(1000);
    }
  };

  const handleMouseLeave = () => {
    if (showControls && !isDragging) {
      resetControlsTimeout(600);
    }
  };

  // Click handler on video canvas: reveals controls on click, or toggles play/pause
  const handleContainerClick = () => {
    if (!showControls) {
      setShowControls(true);
      if (!isPlaying) {
        togglePlay();
      }
      resetControlsTimeout(1000);
    } else {
      togglePlay();
      resetControlsTimeout(1000);
    }
  };

  const handleCenterPlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowControls(true);
    togglePlay();
    resetControlsTimeout(1000);
  };

  // Format seconds to M:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const effectiveDuration = (duration > 0 && isFinite(duration)) ? duration : 16.72;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  return (
    <div 
      className={`relative mx-auto w-full group ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Ambient Blue/Indigo Glow */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-blue-500/30 rounded-2xl md:rounded-3xl blur-xl md:blur-2xl opacity-60 group-hover:opacity-90 transition duration-700 pointer-events-none" />

      {/* Main Studio Frame */}
      <div 
        ref={containerRef}
        className="relative rounded-xl sm:rounded-2xl md:rounded-3xl border border-white/10 bg-[#0d0d0d] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8),0_0_60px_-15px_rgba(59,130,246,0.3)] backdrop-blur-xl transition-all duration-300 group-hover:border-blue-500/40 select-none"
      >
        {/* macOS / IDE Title Bar */}
        <div className="flex items-center px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#141414]/90 border-b border-white/5 backdrop-blur-md">
          {/* Traffic Light Dots */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ff5f56]/80 border border-[#e0443e]/40 transition-opacity hover:opacity-100" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#ffbd2e]/80 border border-[#dea123]/40 transition-opacity hover:opacity-100" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27c93f]/80 border border-[#1aab29]/40 transition-opacity hover:opacity-100" />
          </div>
        </div>

        {/* Video Canvas Container (1680:1080 native aspect ratio) */}
        <div 
          className="relative aspect-[1680/1080] w-full bg-black cursor-pointer overflow-hidden flex items-center justify-center"
          onClick={handleContainerClick}
        >
          <video
            ref={videoRef}
            src="/angle-demo.mp4"
            poster="/angle-demo-poster.webp"
            preload="auto"
            playsInline
            muted
            loop
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onProgress={handleTimeUpdate}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-cover"
          />

          {/* Center Play Button Overlay (Visible when paused) */}
          <div 
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 bg-black/40 backdrop-blur-[2px] ${
              isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <button
              onClick={handleCenterPlayClick}
              className="group/btn relative flex items-center justify-center w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22 rounded-full bg-black/70 backdrop-blur-xl border border-blue-500/50 text-blue-400 shadow-[0_0_40px_-5px_rgba(59,130,246,0.5)] transform hover:scale-110 active:scale-95 transition-all duration-300"
              aria-label="Play Demo Video"
            >
              <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping opacity-75" />
              <Play className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 ml-0.5 fill-blue-400 text-blue-400" />
            </button>
          </div>

          {/* Bottom Gradient for Controls */}
          <div 
            className={`absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none transition-opacity duration-300 ${
              showControls || isDragging ? "opacity-100" : "opacity-0"
            }`} 
          />

          {/* Controls Bar */}
          <div 
            className={`absolute bottom-0 left-0 right-0 p-3 sm:p-5 md:p-6 transition-all duration-300 z-10 ${
              showControls || isDragging 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-2 pointer-events-none"
            }`}
          >
            {/* Custom Interactive Seekbar */}
            <div
              ref={scrubberRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onKeyDown={handleKeyDown}
              tabIndex={0}
              role="slider"
              aria-label="Video scrubber"
              aria-valuemin={0}
              aria-valuemax={effectiveDuration}
              aria-valuenow={currentTime}
              className="group/scrubber relative w-full py-2 -my-2 flex items-center cursor-pointer touch-none select-none outline-none mb-1.5 sm:mb-2"
            >
              {/* Scrubber Track */}
              <div className="relative w-full h-2 sm:h-2.5 group-hover/scrubber:h-3 rounded-full bg-white/10 transition-all duration-200 overflow-hidden">
                {/* Buffer Progress (Downloaded Indicator) */}
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-white/20 rounded-full transition-all duration-300 pointer-events-none z-0"
                  style={{ width: `${bufferedPercent}%` }}
                />

                {/* Played Progress (Blue & Indigo Accent Seekbar) */}
                <div 
                  className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)] pointer-events-none z-10 transition-[width] duration-75"
                  style={{ width: `${progressPercent}%`, minWidth: currentTime > 0 ? "4px" : "0px" }}
                />
              </div>

              {/* Scrubber Playhead Thumb */}
              <div 
                className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-blue-400 rounded-full shadow-[0_0_12px_rgba(59,130,246,1)] border-2 border-black transform -translate-x-1/2 transition-all pointer-events-none z-20 ${
                  isDragging ? "opacity-100 scale-125" : "opacity-0 group-hover/scrubber:opacity-100 group-focus-visible/scrubber:opacity-100"
                }`}
                style={{ left: `${progressPercent}%` }}
              />

              {/* Hover Position & Tooltip */}
              {hoverTime !== null && hoverPosition !== null && (
                <div 
                  className="absolute -top-7 sm:-top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-[10px] sm:text-[11px] font-mono text-blue-300 border border-blue-500/40 shadow-lg pointer-events-none whitespace-nowrap"
                  style={{ left: `${hoverPosition}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            {/* Control Buttons & Indicators */}
            <div className="flex items-center justify-between text-white text-xs sm:text-sm">
              {/* Left: Play/Pause, Replay, Time Display */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                    resetControlsTimeout(1000);
                  }}
                  className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white hover:text-blue-400 transition-all active:scale-90"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={handleRestart}
                  className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-blue-400 transition-all active:scale-90"
                  title="Replay from start"
                  aria-label="Replay"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                {/* Timestamp */}
                <div className="font-mono text-[11px] sm:text-xs text-gray-300 pl-0.5 sm:pl-1">
                  <span className="text-white font-medium">{formatTime(currentTime)}</span>
                  <span className="text-gray-500 mx-1">/</span>
                  <span className="text-gray-400">{formatTime(effectiveDuration)}</span>
                </div>
              </div>

              {/* Right: Speed Pills & Fullscreen */}
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <div className="flex items-center bg-black/60 backdrop-blur-md rounded-lg p-0.5 border border-white/10">
                  {[1, 1.5, 2].map((spd) => (
                    <button
                      key={spd}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSpeedChange(spd);
                      }}
                      className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-mono font-bold rounded-md transition-all ${
                        playbackSpeed === spd
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                      aria-label={`Set speed to ${spd}x`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-blue-400 transition-all active:scale-90 hidden sm:block"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  aria-label="Toggle Fullscreen"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4" />
                  ) : (
                    <Maximize className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
