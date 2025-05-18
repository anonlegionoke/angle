"use client";

import React, { useState, useRef } from 'react';
import AudioRecorder from './AudioRecorder';

export interface AudioClip {
  id: string;
  name: string;
  url: string;
  blob: Blob;
  startTime: number;
  duration: number;
}

interface AudioManagerProps {
  onAddAudioClip: (clip: AudioClip) => void;
  onClose: () => void;
  currentTime: number;
}

const AudioManager: React.FC<AudioManagerProps> = ({ onAddAudioClip, onClose, currentTime }) => {
  const [activeTab, setActiveTab] = useState<'record' | 'import'>('record');
  const [clipName, setClipName] = useState<string>(`Audio Clip ${new Date().toLocaleTimeString()}`);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleAudioRecorded = (audioBlob: Blob, audioUrl: string, duration: number) => {
    const audio = new Audio(audioUrl);
    
    audio.onloadedmetadata = () => {
      const newClip: AudioClip = {
        id: `audio-${Date.now()}`,
        name: clipName,
        url: audioUrl,
        blob: audioBlob,
        startTime: currentTime,
        duration: duration
      };
      
      onAddAudioClip(newClip);
      onClose();
    };
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file.');
      return;
    }
    
    const url = URL.createObjectURL(file);
    
    const audio = new Audio(url);
    
    audio.onloadedmetadata = () => {
      const newClip: AudioClip = {
        id: `audio-${Date.now()}`,
        name: clipName || file.name,
        url: url,
        blob: file,
        startTime: currentTime,
        duration: audio.duration
      };
      
      onAddAudioClip(newClip);
      onClose();
    };
    
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      alert('Error loading audio file. Please try another file.');
    };
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
      <div className="bg-editor-bg border bg-black border-editor-border rounded-lg shadow-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Audio</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
        
        {/* Audio clip name input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Clip Name</label>
          <input
            type="text"
            value={clipName}
            onChange={(e) => setClipName(e.target.value)}
            className="w-full bg-editor-panel border border-editor-border rounded px-3 py-2 text-white"
            placeholder="Enter a name for this audio clip"
          />
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-editor-border mb-4">
          <button
            className={`px-4 py-2 ${activeTab === 'record' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'} cursor-pointer`}
            onClick={() => setActiveTab('record')}
          >
            Record
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'import' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'} cursor-pointer`}
            onClick={() => setActiveTab('import')}
          >
            Import
          </button>
        </div>
        
        {/* Tab content */}
        {activeTab === 'record' ? (
          <AudioRecorder 
            onAudioRecorded={handleAudioRecorded} 
            onCancel={onClose} 
          />
        ) : (
          <div className="py-4">
            <p className="text-sm text-gray-400 mb-4">
              Import an audio file from your computer. Supported formats: MP3, WAV, OGG, AAC.
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <button
              onClick={handleImportClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
              </svg>
              Select Audio File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioManager;
