import {Inter} from 'next/font/google'
import ChatWindow from "@/components/ChatWindow";
import React, {useState} from "react";
import ChatInput from "@/components/ChatInput";
import {CompletionResponse} from "@/pages/api/completion";

const inter = Inter({subsets: ['latin']})


export interface Message {
  text: string;
  sender: 'user' | 'bot';
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSendQuestion(question: string) {
    setMessages([{
      sender: 'user',
      text: question
    }]);

    setLoading(true);

    const completion: CompletionResponse = await fetch('/api/completion', {
      method: 'POST',
      body: JSON.stringify({question}),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => res.json())

    setMessages(prevMessages => [...prevMessages, {
      sender: 'bot',
      text: completion.completion
    }]);
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex w-full justify-center p-4">
        <h1 className="font-bold text-3xl text-gray-700">Hilla AI</h1>
        </div>
        <div className="flex-grow">
          <ChatWindow messages={messages}/>
        </div>
        <div className="w-full p-4">
          <ChatInput onSendMessage={handleSendQuestion}/>
        </div>
    </div>
  );
}
