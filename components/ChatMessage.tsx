// components/ChatMessage.tsx
import React from 'react';
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import Image from "next/image";
import hillaLogo from "../assets/hilla.png";

interface ChatMessageProps {
  message: string;
  sender: 'user' | 'bot';
}

export default function ChatMessage({message, sender}: ChatMessageProps) {
  return (
    <div className={`w-full ${
      sender === 'user' ? 'bg-white border-y border-gray-200' : ''
    }`}>
      <div
        className="flex gap-4 items-start md:max-w-2xl lg:max-w-2xl xl:max-w-3xl p-4 md:py-6 lg:px-0 m-auto"
      >
        {sender === 'bot' ? <Image src={hillaLogo} alt="Hilla AI" className="w-[25px]"/> : <div className="w-[25px]"/>}

        <div>
          <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
            {message}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

