"use client";

import React, { useState, useEffect } from 'react';

interface VideoPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoSrc: string;
  onMetadataLoaded: () => void;
  onTimeUpdate: () => void;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoRef,
  videoSrc,
  onMetadataLoaded,
  onTimeUpdate
}) => {
  // Use state to track client-side rendering
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true after component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  return (
    <div className="flex-3 flex justify-center items-center bg-black p-4 border-b border-editor-border">
      {isClient && videoSrc ? (
        <video
          ref={videoRef}
          className="max-w-full max-h-[60vh]"
          src={videoSrc}
          controls
          onLoadedMetadata={onMetadataLoaded}
          onTimeUpdate={onTimeUpdate}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-[60vh] w-full bg-editor-panel rounded">
          <span className="text-xl mb-4">VIDEO</span>
          <p className="text-gray-400">{isClient && !videoSrc ? 'No video loaded' : 'Loading...'}</p>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;
