import {Inter} from 'next/font/google'
import ChatWindow from "@/components/ChatWindow";
import React, {useState} from "react";
import ChatInput from "@/components/ChatInput";
import {CompletionResponse} from "@/pages/api/completion";
import {ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum} from "openai";

const inter = Inter({subsets: ['latin']})

export default function Home() {
  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSendQuestion(question: string) {
    const newMessages = [...messages, {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: question
    }];
    setMessages(newMessages);

    setLoading(true);

    const completion: CompletionResponse = await fetch('/api/completion', {
      method: 'POST',
      body: JSON.stringify({messages: newMessages}),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => res.json())

    setMessages(prevMessages => [...prevMessages, completion.message]);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex flex-col w-full items-center justify-center p-4 border-b border-gray-300">
        <h1 className="font-bold text-3xl text-gray-700">Hilla AI</h1>
        <span className="text-xs">Note: does not yet support streaming the answer, be patient.</span>
      </div>
      <ChatWindow messages={messages} loading={loading}/>
      <ChatInput onSendMessage={handleSendQuestion}/>
    </div>
  );
}
