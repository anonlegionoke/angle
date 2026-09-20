"use client";

import React, { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';

export default function DesktopRequiredModal() {
  const [isOpen, setIsOpen] = useState(false);

  const applyDesktopMode = () => {
    const viewports = document.querySelectorAll('meta[name=viewport]');
    if (viewports.length > 0) {
      viewports.forEach(v => v.setAttribute('content', 'width=1024, initial-scale=1, maximum-scale=1'));
    } else {
      const viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      viewport.setAttribute('content', 'width=1024, initial-scale=1, maximum-scale=1');
      document.head.appendChild(viewport);
    }
  };

  useEffect(() => {
    const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);
    const hasDismissed = sessionStorage.getItem('angle_desktop_warning_dismissed');

    if (isMobile) {
      if (!hasDismissed) {
        setIsOpen(true);
      } else {
        applyDesktopMode();
      }
    }

    return () => {
      // Revert viewport back to responsive when leaving the editor
      const viewports = document.querySelectorAll('meta[name=viewport]');
      viewports.forEach(v => v.setAttribute('content', 'width=device-width, initial-scale=1'));
    };
  }, []);

  const handleContinueAnyway = () => {
    setIsOpen(false);
    sessionStorage.setItem('angle_desktop_warning_dismissed', 'true');
    applyDesktopMode();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111111] border border-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center text-blue-500 mb-2">
          <Monitor className="w-16 h-16" />
        </div>
        <h2 className="text-2xl font-bold text-gray-100">Desktop Screen Recommended</h2>
        <p className="text-gray-400 text-sm">
          Angle&apos;s interface is designed for larger screens. 
          For the best experience, please switch to a desktop or laptop device.
        </p>
        
        <div className="pt-4 flex flex-col space-y-3">
          <button 
            onClick={handleContinueAnyway}
            className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-500 rounded-lg transition-colors font-semibold cursor-pointer"
          >
            Continue anyway (Desktop Mode)
          </button>
        </div>
      </div>
    </div>
  );
}
