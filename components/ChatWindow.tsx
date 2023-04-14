// components/ChatWindow.tsx
import React, {useEffect, useRef, useState} from 'react';
import ChatMessage from "@/components/ChatMessage";
import LoadingIndicator from "@/components/LoadingIndicator";
import {ChatCompletionRequestMessage} from "openai";

interface ChatWindowProps {
  messages: ChatCompletionRequestMessage[];
  loading: boolean;
}

export default function ChatWindow({messages, loading}: ChatWindowProps) {

  return (
    <div className="flex-grow overflow-y-auto">
      {messages.map((message, index) => (
        <ChatMessage key={index} content={message.content} role={message.role}/>
      ))}
      {loading && <LoadingIndicator/>}
    </div>
  );
}
