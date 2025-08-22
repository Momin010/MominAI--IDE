import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '../contexts/AIContext';
import type { Message } from '../types';

declare const marked: any;

const AIAssistant: React.FC = () => {
  const { messages, sendMessage, isLoading, applyChanges } = useAI();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async () => {
    const prompt = input;
    if (prompt.trim() === '' || isLoading) return;
    setInput('');
    await sendMessage(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (msg: Message) => {
      if (typeof marked === 'undefined') {
          return <p className="text-sm whitespace-pre-wrap">{msg.text}</p>;
      }
      const rawHtml = marked.parse(msg.text);
      return (
        <div className="prose prose-sm prose-invert max-w-none">
            <span dangerouslySetInnerHTML={{ __html: rawHtml }} />
            {msg.isStreaming && <span className="inline-block w-2 h-4 bg-white/70 ml-1 animate-pulse" />}
        </div>
      );
  };

  return (
    <div className="text-gray-200 h-full flex flex-col bg-[var(--ui-panel-bg)] backdrop-blur-md">
      <div className="p-2 border-b border-[var(--ui-border)] flex-shrink-0">
        <h2 className="text-sm font-bold uppercase tracking-wider">AI Assistant</h2>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-lg p-3 max-w-xs md:max-w-md lg:max-w-lg shadow-md animate-fade-in-up ${msg.sender === 'user' ? 'bg-[var(--accent-secondary)]/80 text-white' : 'bg-gray-700/50 text-gray-200'}`}>
              {renderMessage(msg)}
              {msg.sender === 'ai' && msg.actions && (
                <div className="mt-4 border-t border-gray-600 pt-3">
                  <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Proposed File Changes</h4>
                  <ul className="space-y-1 text-sm mb-3">
                    {msg.actions.map((action, actionIndex) => (
                      <li key={actionIndex} className="flex items-center p-1 bg-black/20 rounded">
                        <span className={`px-1.5 py-0.5 text-xs rounded mr-2 font-semibold ${action.action === 'create' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-black'}`}>
                          {action.action.toUpperCase()}
                        </span>
                        <span className="font-mono text-gray-300 truncate">{action.path}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => applyChanges(index, msg.actions!)}
                    disabled={msg.actionsApplied}
                    className="w-full text-sm bg-[var(--accent-primary)]/80 hover:bg-[var(--accent-primary)]/70 text-black font-bold rounded px-3 py-1.5 transition-colors disabled:bg-green-700 disabled:cursor-default disabled:hover:bg-green-700 disabled:text-white"
                  >
                    {msg.actionsApplied ? '✓ Changes Applied' : 'Review Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && messages.length > 0 && messages[messages.length-1].isStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-700/50 text-gray-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t border-[var(--ui-border)] flex-shrink-0">
        <div className="flex items-center bg-black/20 rounded-lg p-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the AI..."
            className="flex-grow bg-transparent border-none outline-none text-white text-sm resize-none p-2"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || input.trim() === ''}
            className="bg-[var(--accent-primary)]/80 text-black p-2 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-[var(--accent-primary)]/70 transition-colors"
          >
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;