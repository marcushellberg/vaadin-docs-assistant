// components/ChatMessage.tsx
import React from 'react';
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
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
        <div className="text-2xl pt-1">
        {role === ChatCompletionRequestMessageRoleEnum.Assistant ? '🤖' : '🧑‍💻'}
        </div>
        <div className="max-w-full overflow-x-scroll">
          <ReactMarkdown rehypePlugins={[[rehypeHighlight, {ignoreMissing: true}]]}>
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

