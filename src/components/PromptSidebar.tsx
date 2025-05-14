"use client";

import React, { useState, useRef, useEffect } from 'react';
import { logChatMessage } from '../utils/logger';

interface PromptSidebarProps {
  onPromptSubmit: (prompt: string) => void;
  isGenerating: boolean;
  projectId?: string | null;
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
  isGenerating,
  projectId
}) => {
  const [prompt, setPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: '1',
      text: "I'll help you create 3Blue1Brown-style math animations. What would you like to visualize?",
      isUser: false,
      timestamp: new Date(),
      status: 'sent'
    };
    
    if (!projectId) {
      setChatMessages([welcomeMessage]);
      return;
    }
    
    const fetchChatLogs = async () => {
      try {
        const response = await fetch(`/api/log?projectId=${projectId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch chat logs');
        }
        
        const data = await response.json();
        
        if (data.logs && data.logs.length > 0) {
          const messages: ChatMessage[] = [];
          
          messages.push(welcomeMessage);
          
          data.logs.forEach((log: any) => {
            messages.push({
              id: `user-${log.timestamp}`,
              text: log.userMessage,
              isUser: true,
              timestamp: new Date(log.timestamp),
              status: 'sent' as 'sent'
            });
            
            if (log.llmResponse) {
              if (log.llmResponse.error) {
                messages.push({
                  id: `error-${log.timestamp}`,
                  text: `Error: ${log.llmResponse.error}`,
                  isUser: false,
                  timestamp: new Date(log.timestamp),
                  status: 'error' as 'error'
                });
              } 
              else if (log.llmResponse.code) {
                messages.push({
                  id: `code-${log.timestamp}`,
                  text: `\`\`\`python\n${log.llmResponse.code}\n\`\`\``,
                  isUser: false,
                  timestamp: new Date(log.timestamp),
                  status: 'sent' as 'sent'
                });
                
                if (log.llmResponse.videoPath) {
                  messages.push({
                    id: `video-${log.timestamp}`,
                    text: "Manim animation generated successfully! You can view it in the preview section.",
                    isUser: false,
                    timestamp: new Date(log.timestamp),
                    status: 'sent' as 'sent'
                  });
                }
              } 
              else if (log.llmResponse.videoPath) {
                messages.push({
                  id: `success-${log.timestamp}`,
                  text: "Manim animation generated successfully! You can now edit it in the timeline.",
                  isUser: false,
                  timestamp: new Date(log.timestamp),
                  status: 'sent' as 'sent'
                });
              }
            }
          });
          
          setChatMessages(messages);
        } else {
          setChatMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error('Error fetching chat logs:', error);
        setChatMessages([welcomeMessage]);
      }
    };
    
    fetchChatLogs();
  }, [projectId]);
  
  const [suggestionPrompts, setSuggestionPrompts] = useState<SuggestionPrompt[]>([]);
  
  useEffect(() => {
    setSuggestionPrompts([
      { id: '1', text: 'Show the Pythagorean theorem' },
      { id: '2', text: 'Transform a square to a circle' },
      { id: '3', text: 'Demonstrate vector fields' },
      { id: '4', text: 'Explain the chain rule in calculus' }
    ]);
  }, []);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSubmit = async () => {
    if (!prompt.trim() || isGenerating) return;

    const promptText = prompt.trim();
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: promptText,
      isUser: true,
      timestamp: new Date(),
      status: 'sent'
    };
    setChatMessages(prev => [...prev, userMessage]);

    const processingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      text: "Generating animation based on your prompt...",
      isUser: false,
      timestamp: new Date(),
      status: 'sending'
    };
    setChatMessages(prev => [...prev, processingMessage]);

    setPrompt('');
    
    updateSuggestionPrompts(promptText);
    
    try {
      console.log('Connecting to backend API...');
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: promptText,
          projectId: projectId || undefined 
        }),
      });
      
      console.log('API response received');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Failed to generate animation');
      }
      
      await logChatMessage(promptText, data, projectId);

      
      setChatMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
      
      if (data.code) {
        const codeMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `\`\`\`python\n${data.code}\n\`\`\``,
          isUser: false,
          timestamp: new Date(),
          status: 'sent'
        };
        setChatMessages(prev => [...prev, codeMessage]);
        
        if (data.videoPath) {
          onPromptSubmit(data.videoPath);
          
          const videoMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            text: "Manim animation generated successfully! You can view it in the preview section.",
            isUser: false,
            timestamp: new Date(),
            status: 'sent'
          };
          setChatMessages(prev => [...prev, videoMessage]);
          return;
        }
        
        return;
      }

      if (!data.videoPath) {
        throw new Error('No video was generated');
      }

      const videoPath = data.videoPath;
      
      console.log('Video path:', videoPath);
      onPromptSubmit(videoPath);
      
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        text: "Manim animation generated successfully! You can now edit it in the timeline.",
        isUser: false,
        timestamp: new Date(),
        status: 'sent'
      };
      setChatMessages(prev => [...prev, successMessage]);
      
    } catch (error: any) {
      console.error('Error generating animation:', error);
      
      try {
        await logChatMessage(promptText, { error: error.message }, projectId);
      } catch (logError) {
        console.error('Error logging chat message:', logError);
      }
      
      setChatMessages(prev => prev.filter(msg => msg.id !== processingMessage.id));
      
      let errorMsg = 'Failed to generate animation';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMsg = 'Could not connect to the backend server. Please make sure the server is running on port 8000.';
        } else if (error.message.includes('Manim is not installed')) {
          errorMsg = 'Manim is not installed on the server. Please install Manim to generate animations.';
        } else if (error.message.includes('LaTeX')) {
          errorMsg = 'LaTeX error: Manim requires LaTeX to be installed for rendering text. Please install LaTeX on the server.';
        } else if (error.message.includes('No video file was generated')) {
          errorMsg = 'Unable to generate the animation. This might be due to system limitations. Please try a simpler prompt.';
        } else if (error.message.includes('FileNotFoundError')) {
          errorMsg = 'There was an issue with file paths when generating the video. Please try again with a different prompt.';
        } else {
          errorMsg = error.message;
        }
      }
      
      onPromptSubmit('');
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `Error: ${errorMsg}`,
        isUser: false,
        timestamp: new Date(),
        status: 'error'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };
  
  const updateSuggestionPrompts = (userPrompt: string) => {
    const newSuggestions = [
      { id: Date.now().toString(), text: 'Add voice narration to this animation' },
      { id: (Date.now() + 1).toString(), text: 'Make the animation slower' },
      { id: (Date.now() + 2).toString(), text: 'Add more visual elements' },
      { id: (Date.now() + 3).toString(), text: 'Change the color scheme' }
    ];
    
    setSuggestionPrompts(newSuggestions);
  };
  
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
    <div className="w-full h-full flex flex-col bg-editor-panel">
      {/* Header with actions */}
      {/* <div className="p-3 border-b border-editor-border flex justify-between items-center">
        <h3 className="text-sm font-medium text-white">Manim Generator</h3>
      </div> */}
      
      {/* Chat messages */}
      <div className="flex-1 p-4 overflow-y-auto w-full">
        <div className="flex flex-col gap-4 w-full">
          {chatMessages.map(message => (
            <div 
              key={message.id}
              className={`p-3 rounded-md max-w-[90%] break-words ${
                message.isUser 
                  ? 'bg-editor-highlight self-end' 
                  : 'bg-editor-panel border border-editor-border self-start'
              } ${
                message.status === 'sending' ? 'opacity-70' : ''
              }`}
            >
              <div className="text-sm text-white/80 mb-1">
                {message.isUser ? 'You' : 'AI'}
                {message.timestamp && (
                  <span className="text-xs ml-2 text-white/50">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className={message.status === 'error' ? 'text-red-400' : ''}>
                {message.status === 'sending' ? (
                  <div className="flex items-center">
                    <span>{message.text}</span>
                    <div className="ml-2 flex gap-1">
                      <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                    </div>
                  </div>
                ) : (
                  message.text.startsWith('```') ? (
                    <pre className="bg-gray-800 p-3 rounded overflow-x-auto">
                      <code>{message.text.replace(/```python\n|```/g, '')}</code>
                    </pre>
                  ) : (
                    message.text
                  )
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Suggestion prompts */}
      <div className="p-4 border-t border-editor-border">
        <p className="text-xs text-gray-400 mb-2">Suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {suggestionPrompts.map(suggestion => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs bg-editor-border hover:bg-editor-highlight transition-colors px-3 py-1 rounded-full text-gray-300"
            >
              {suggestion.text}
            </button>
          ))}
        </div>
      </div>
      
      {/* Input field */}
      <div className="p-4 border-t border-editor-border">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-editor-bg border border-editor-border rounded p-3 pr-12 text-white resize-none focus:outline-none focus:border-editor-highlight"
            placeholder="Describe the math animation you want to create..."
            rows={3}
            disabled={isGenerating}
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className={`absolute bottom-3 right-3 rounded-full w-8 h-8 flex items-center justify-center transition-colors ${
              !prompt.trim() || isGenerating
                ? 'bg-editor-border text-gray-500 cursor-not-allowed'
                : 'bg-editor-highlight text-white hover:bg-blue-700'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptSidebar;
