// components/ChatWindow.tsx
import React, {useEffect, useRef, useState} from 'react';
import ChatMessage from "@/components/ChatMessage";
import {Message} from "@/pages";
import LoadingIndicator from "@/components/LoadingIndicator";

interface ChatWindowProps {
  messages: Message[];
  loading: boolean;
}

export default function ChatWindow({messages, loading}: ChatWindowProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null);


  // Scroll to bottom when new message is added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-full overflow-y-auto" ref={chatContainerRef}>
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message.text} sender={message.sender}/>
      ))}
      {loading && <LoadingIndicator/>}
    </div>
  );
}
