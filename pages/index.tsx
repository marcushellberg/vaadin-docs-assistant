import {Inter} from 'next/font/google'
import ChatWindow from "@/components/ChatWindow";
import React, {useState} from "react";
import ChatInput from "@/components/ChatInput";
import {ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum} from "openai";

const inter = Inter({subsets: ['latin']})

export default function Home() {
  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  async function handleSendQuestion(question: string) {
    if(loading) return;

    const newMessages = [...messages, {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: question
    }];
    setMessages(newMessages);

    setLoading(true);
    setWorking(true);

    const response = await fetch('/api/completion', {
        method: 'POST',
        body: JSON.stringify({messages: newMessages}),
        headers: {'Content-Type': 'application/json'}
      });

    // This data is a ReadableStream
    const data = response.body;
    if (!data) {
      return;
    }

    const reader = data.getReader();
    const decoder = new TextDecoder();
    let done = false;

    setLoading(false);
    setMessages(msg => [...msg, {
      role: ChatCompletionRequestMessageRoleEnum.Assistant,
      content: ''
    }]);

    while (!done) {
      const {value, done: doneReading} = await reader.read();
      done = doneReading;
      const chunkValue = decoder.decode(value);
      // add the value to the last message content
      setMessages(msg => {
        const lastMessage = msg[msg.length - 1];
        lastMessage.content += chunkValue;
        return [...msg.slice(0, -1), lastMessage];
      });
    }
    setWorking(false);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex flex-col w-full items-center justify-center p-4 border-b border-gray-300">
        <h1 className="font-bold text-3xl text-gray-700">Hilla AI</h1>
      </div>
      <ChatWindow messages={messages} loading={loading}/>
      <ChatInput onSendMessage={handleSendQuestion} working={working}/>
    </div>
  );
}
