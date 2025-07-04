"use client";

import React, { useState, useRef, useEffect } from 'react';

interface PromptSidebarProps {
  onPromptSubmit: (prompt: string) => void;
  isGenerating: boolean;
  projectId?: string | null;
  setLatestPromptId: React.Dispatch<React.SetStateAction<string>>;
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

export type Prompt = {
  id: string;
  usrMsg: string;
  timestamp: Date;
  llmRes: string;
}

const PromptSidebar: React.FC<PromptSidebarProps> = ({
  onPromptSubmit,
  isGenerating,
  projectId,
  setLatestPromptId
}) => {
  const [prompt, setPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  useEffect(() => {
    if (chatMessages && chatMessages[chatMessages.length - 1]?.status === 'sending' || prompt || chatMessages?.length > 3) {
      setShowSuggestions(false);
    } else {
      setShowSuggestions(true);
    }
  }, [prompt, chatMessages])
  
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: '1',
      text: "What would you like to visualize today?",
      isUser: false,
      status: 'sent'
    };
    
    if (!projectId) {
      setChatMessages([welcomeMessage]);
      return;
    }
    
    const fetchChatLogs = async () => {
      try {
        const response = await fetch(`/api/prompts?projectId=${projectId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch chat logs');
        }
        
        const data = await response.json();
                
        if (data.prompts && data.prompts.length > 0) {
          const messages: ChatMessage[] = [];
          
          messages.push(welcomeMessage);
          
          data.prompts.forEach((prompt: Prompt) => {
            messages.push({
              id: `sent-${prompt.id}`,
              text: prompt.usrMsg,
              isUser: true,
              timestamp: new Date(prompt.timestamp),
              status: 'sent'
            });
            
            if (prompt.llmRes) {
              const llmRes = JSON.parse(prompt.llmRes);
              if (llmRes.error) {
                messages.push({
                  id: `error-${prompt.id}`,
                  text: `Error: ${llmRes.error}`,
                  isUser: false,
                  timestamp: new Date(prompt.timestamp),
                  status: 'error'
                });
              } 
              else if (llmRes.code) {
                messages.push({
                  id: `code-${prompt.id}`,
                  text: `\`\`\`python\n${llmRes.code}\n\`\`\``,
                  isUser: false,
                  timestamp: new Date(prompt.timestamp),
                  status: 'sent'
                });
                
                if (llmRes.videoPath) {
                  messages.push({
                    id: `success-${prompt.id}`,
                    text: "Manim animation generated successfully! You can view it in the preview section.",
                    isUser: false,
                    timestamp: new Date(prompt.timestamp),
                    status: 'sent'
                  });
                }
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
      { id: '4', text: 'Display a thank you note' }
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
    
    updateSuggestionPrompts();
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: promptText,
          projectId: projectId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Failed to generate animation');
      }
      
      setLatestPromptId(data?.promptId);
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
        
        if (data.videoPath === 'pending') {
          onPromptSubmit(data.videoPath);
          
          const videoMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            text: "Animation is being generated! You can view it in the preview section once it's ready.",
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
      
      onPromptSubmit(videoPath);
      
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        text: "Manim animation generated successfully! You can now edit it in the timeline.",
        isUser: false,
        timestamp: new Date(),
        status: 'sent'
      };
      setChatMessages(prev => [...prev, successMessage]);
      
    } catch (error: unknown) {
      console.error('Error generating animation:', error);
      
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
  
  const updateSuggestionPrompts = () => {
    const newSuggestions = [
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
    <div className="w-full h-full flex flex-col bg-editor-pane">
      {/* Header with actions */}
      {/* <div className="p-3 border-b border-editor-border flex justify-between items-center">
        <h3 className="text-sm font-medium text-white">Manim Generator</h3>
      </div> */}
      
      {/* Chat messages */}
      <div className="flex-1 p-4 overflow-y-auto w-full text-sm">
        <div className="flex flex-col gap-4 w-full">
          {chatMessages.map(message => (
            <div 
              key={message.id}
              className={`p-3 rounded-md max-w-[90%] break-words ${
                message.isUser 
                  ? 'bg-editor-highlight self-end' 
                  : 'bg-editor-panel border border-editor-border self-start rounded-xl'
              } ${
                message.status === 'sending' ? 'opacity-70' : ''
              }`}
            >
              <div className="text-sm text-white/80 mb-1">
                {message.isUser ? 'You' : 'Angle'}
                {message.timestamp && (
                  <span className="text-xs ml-2 text-white/50">
                  {(() => {
                    const timestamp = message.timestamp;
                    const now = new Date();
                    const isToday =
                      timestamp.getDate() === now.getDate() &&
                      timestamp.getMonth() === now.getMonth() &&
                      timestamp.getFullYear() === now.getFullYear();
                
                    return isToday
                      ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : timestamp.toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                  })()}
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
      <div className={showSuggestions ? "p-3" : "hidden"}>
      <div className="p-4 border-1 rounded-xl">
        <p className="text-xs text-gray-400 mb-2">Suggestions:</p>
        <div className="flex flex-wrap gap-2">
          {suggestionPrompts.map(suggestion => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs bg-editor-border hover:bg-editor-highlight transition-colors px-3 py-1 rounded-full text-gray-300 cursor-pointer border-1 hover:bg-gray-600"
            >
              {suggestion.text}
            </button>
          ))}
        </div>
      </div>
      </div>

      {/* Input field */}
      <div className="p-3">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-editor-bg border border-editor-border rounded-xl p-3 pr-12 text-white resize-none focus:outline-none focus:border-editor-highlight"
            placeholder="Describe the math animation you want to create..."
            rows={3}
            disabled={isGenerating}
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className={`absolute bottom-3 right-3 rounded-full w-8 h-8 flex items-center justify-center transition-colors ${
              !prompt.trim() || isGenerating
                ? 'bg-editor-border text-gray-500 cursor-not-allowed border-1 border-gray-500'
                : 'bg-editor-highlight text-white border-2 border-white hover:bg-blue-700 cursor-pointer'
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
