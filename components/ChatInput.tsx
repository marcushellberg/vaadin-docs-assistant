// components/ChatInput.tsx
import React, {useEffect, useRef, useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  working: boolean
}

export default function ChatInput({onSendMessage, working}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    if (textareaRef.current) {
      const element = textareaRef.current;
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    }
  }, [message]);

  function handleKeyPress(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !(e.shiftKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleSubmit (e: React.FormEvent) {
    e.preventDefault();

    if (working) return;

    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  }

  return (
    <div className="w-full p-4 flex gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl lg:px-0 m-auto">
      <form className="flex w-full relative" onSubmit={handleSubmit} >
        <textarea
          ref={textareaRef}
          className="resize-none w-full p-4 bg-white border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          placeholder="Type your text here"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <button
          type="submit"
          className="absolute bottom-4 right-4 p-2 bg-blue-600 text-white font-semibold rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          { working ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) :
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round"
                 strokeLinejoin="round" className="h-5 w-5"
                 xmlns="http://www.w3.org/2000/svg">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>}
        </button>
      </form>
    </div>
  );
}
