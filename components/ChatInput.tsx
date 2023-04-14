// components/ChatInput.tsx
import React, {useState} from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export default function ChatInput({onSendMessage}: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="w-full p-4 flex gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl lg:px-0 m-auto w-full">
      <form className="flex w-full" onSubmit={handleSubmit}>
        <input
          className="flex-grow px-4 py-2 rounded-l-md rounded-r-none border border-gray-300 focus:outline-none"
          type="text"
          placeholder="Ask anything about Hilla..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="px-4 py-2 bg-blue-600 text-white rounded-r-md" type="submit">
          Ask
        </button>
      </form>
    </div>
  );
}
