"use client";

import React, { useState, useRef, useEffect } from 'react';
import ClientOnly from './ClientOnly';

interface PromptSidebarProps {
  onPromptSubmit: (prompt: string) => void;
  isGenerating: boolean;
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp?: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface SuggestionPrompt {
  id: string;
  text: string;
}

const PromptSidebar: React.FC<PromptSidebarProps> = ({
  onPromptSubmit,
  isGenerating
}) => {
  const [prompt, setPrompt] = useState('');
  // Use empty initial state to prevent hydration errors
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Add initial welcome message on client-side only
  useEffect(() => {
    setChatMessages([
      {
        id: '1',
        text: "I'll help you create 3Blue1Brown-style math animations. What would you like to visualize?",
        isUser: false,
        timestamp: new Date(),
        status: 'sent'
      }
    ]);
  }, []);
  
  // Use empty initial state for suggestion prompts
  const [suggestionPrompts, setSuggestionPrompts] = useState<SuggestionPrompt[]>([]);
  
  // Add initial suggestion prompts on client-side only
  useEffect(() => {
    setSuggestionPrompts([
      { id: '1', text: 'Show the Pythagorean theorem' },
      { id: '2', text: 'Visualize sine and cosine on the unit circle' },
      { id: '3', text: 'Demonstrate vector fields' },
      { id: '4', text: 'Explain the chain rule in calculus' }
    ]);
  }, []);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  // Auto-scroll to bottom of messages when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSubmit = async () => {
    if (!prompt.trim() || isGenerating) return;

    const promptText = prompt.trim();
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: promptText,
      isUser: true,
      timestamp: new Date(),
      status: 'sent'
    };
    setChatMessages(prev => [...prev, userMessage]);

    // Add system processing message
    const processingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: "Generating animation based on your prompt...",
      isUser: false,
      timestamp: new Date(),
      status: 'sending'
    };
    setChatMessages(prev => [...prev, processingMessage]);

    // Clear the input
    setPrompt('');
    
    // Generate new suggestion prompts based on the current prompt
    updateSuggestionPrompts(promptText);
    
    try {
      // Call the API to generate the animation
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: promptText }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate animation');
      }
      
      // Call the onPromptSubmit callback with the video path
      onPromptSubmit(data.videoPath);
      
      // Remove the processing message
      setChatMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
      
      // Add success message
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        text: "Animation generated successfully! You can now edit it in the timeline.",
        isUser: false,
        timestamp: new Date(),
        status: 'sent'
      };
      setChatMessages(prev => [...prev, successMessage]);
      
    } catch (error) {
      console.error('Error generating animation:', error);
      
      // Remove the processing message
      setChatMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `Error: ${error instanceof Error ? error.message : 'Failed to generate animation'}`,
        isUser: false,
        timestamp: new Date(),
        status: 'error'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };
  
  // Update suggestion prompts based on user input
  const updateSuggestionPrompts = (userPrompt: string) => {
    // In a real app, these would be generated based on the user's input and context
    // For now, we'll just rotate through some predefined suggestions
    const newSuggestions = [
      { id: Date.now().toString(), text: 'Add voice narration to this animation' },
      { id: (Date.now() + 1).toString(), text: 'Make the animation slower' },
      { id: (Date.now() + 2).toString(), text: 'Add more visual elements' },
      { id: (Date.now() + 3).toString(), text: 'Change the color scheme' }
    ];
    
    setSuggestionPrompts(newSuggestions);
  };
  
  // Handle clicking a suggestion prompt
  const handleSuggestionClick = (suggestion: SuggestionPrompt) => {
    setPrompt(suggestion.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-[300px] flex flex-col bg-editor-panel border-l border-editor-border">
      {/* Chat messages */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {chatMessages.map(message => (
            <div 
              key={message.id}
              className={`p-3 rounded-md max-w-[90%] ${
                message.isUser 
                  ? 'bg-editor-highlight self-end' 
                  : 'bg-editor-panel border border-editor-border self-start'
              } ${
                message.status === 'sending' ? 'opacity-70' : ''
              } ${
                message.status === 'error' ? 'border-red-500' : ''
              }`}
            >
              {message.text}
              {message.status === 'sending' && (
                <div className="mt-1 text-xs opacity-70 flex items-center">
                  <span className="animate-pulse mr-1">●</span> Processing...
                </div>
              )}
              {message.timestamp && (
                <ClientOnly>
                  <div className="mt-1 text-xs opacity-50 text-right">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </ClientOnly>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestion prompts */}
      {suggestionPrompts.length > 0 && !isGenerating && (
        <div className="p-2 border-t border-editor-border">
          <div className="text-xs text-gray-400 mb-2">Suggestions:</div>
          <div className="flex flex-wrap gap-2">
            {suggestionPrompts.map(suggestion => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs bg-editor-panel border border-editor-border rounded-full px-3 py-1 hover:bg-editor-highlight transition-colors"
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt input */}
      <div className="p-4 border-t border-editor-border">
        <div className="flex gap-2">
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter your prompt here..."
            className="flex-1 bg-[#2a2a2a] text-white border border-editor-border rounded p-2 resize-none h-[40px]"
            disabled={isGenerating}
          />
          <button
            onClick={handleSubmit}
            disabled={isGenerating || !prompt.trim()}
            className={`w-10 h-10 flex items-center justify-center rounded ${
              isGenerating || !prompt.trim()
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-editor-highlight hover:bg-blue-700'
            }`}
          >
            {isGenerating ? (
              <span className="animate-spin">↻</span>
            ) : (
              '→'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptSidebar;
