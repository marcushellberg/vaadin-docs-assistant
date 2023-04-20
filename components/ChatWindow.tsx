// components/ChatWindow.tsx
import React, {useEffect, useRef } from 'react';
import ChatMessage from "@/components/ChatMessage";
import {ChatCompletionRequestMessage} from "openai";

interface ChatWindowProps {
  messages: ChatCompletionRequestMessage[];
}

export default function ChatWindow({ messages }: ChatWindowProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex-grow overflow-y-auto" ref={containerRef}>
      {messages.map((message, index) => (
        <ChatMessage key={index} content={message.content} role={message.role} />
      ))}
    </div>
  );
}

