// components/ChatMessage.tsx
import React from 'react';
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import Image from "next/image";
import hillaLogo from "../assets/hilla.png";
import 'highlight.js/styles/atom-one-light.css'
import {ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum} from "openai";


export default function ChatMessage({content, role}: ChatCompletionRequestMessage) {
  return (
    <div className={`w-full border-b border-gray-300 ${
      role === ChatCompletionRequestMessageRoleEnum.User ? 'bg-white' : ''
    }`}>
      <div
        className="flex gap-4 items-start md:max-w-2xl lg:max-w-2xl xl:max-w-3xl p-4 md:py-6 lg:px-0 m-auto max-w-full box-border"
      >
        {role === ChatCompletionRequestMessageRoleEnum.Assistant ? <Image src={hillaLogo} alt="Hilla AI" className="w-[25px]"/> : <div className="w-[25px]"/>}

        <div className="max-w-full overflow-x-scroll">
          <ReactMarkdown rehypePlugins={[[rehypeHighlight, {ignoreMissing: true}]]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

