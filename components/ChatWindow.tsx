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

  return (
    <div className="flex-grow overflow-y-auto">
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message.text} sender={message.sender}/>
      ))}
      {loading && <LoadingIndicator/>}
    </div>
  );
}
