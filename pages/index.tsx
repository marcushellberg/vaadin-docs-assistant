import {Inter} from 'next/font/google'
import ChatWindow from "@/components/ChatWindow";
import React, {useState} from "react";
import ChatInput from "@/components/ChatInput";
import {ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum} from "openai";

const inter = Inter({subsets: ['latin']})

export default function Home() {
  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [working, setWorking] = useState(false);
  const [frontend, setFrontend] = useState('react');

  async function handleSendQuestion(question: string) {
    if (working) return;

    const newMessages = [...messages, {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: question
    }];
    setMessages(newMessages);
    setWorking(true);

    // Based on https://vercel.com/blog/gpt-3-app-next-js-vercel-edge-functions#edge-functions-with-streaming
    const response = await fetch('/api/completion', {
      method: 'POST',
      body: JSON.stringify({
        messages: newMessages,
        frontend
      }),
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
      <div className="flex flex-col gap-4 w-full items-center justify-center p-4 border-b border-gray-300">
        <h1 className="font-bold  text-3xl text-gray-700">Hilla Docs Assistant 🤖</h1>
        <div className="flex gap-8">
          <select className="p-1 border border-gray-300 rounded-md" value={frontend} onChange={e => {
            setFrontend(e.target.value);
            setMessages([]);
          }}>
            <option value="react">React</option>
            <option value="lit">Lit</option>
          </select>
          <button className="py-1 px-2 border border-gray-300 rounded-md" onClick={() => setMessages([])}>Reset</button>
        </div>
      </div>
      <ChatWindow messages={messages}/>
      <ChatInput onSendMessage={handleSendQuestion} working={working}/>
      <div className="p-2 text-xs text-center">Note: this is an experimental app, there are no guarantees for
        correctness. Expect errors and downtime.
      </div>
    </div>
  );
}
