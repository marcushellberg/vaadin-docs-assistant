// components/ChatWindow.tsx
import React, {useEffect, useRef, useState} from 'react';
import ChatMessage from "@/components/ChatMessage";
import {Message} from "@/pages";

interface ChatWindowProps {
  messages: Message[];
}

export default function ChatWindow({messages}: ChatWindowProps) {
  // const [chatHistory, setChatHistory] = useState<Message[]>([
  //   {
  //     sender: 'user',
  //     text: 'How do I restrict access to an endpoint?'
  //   },
  //   {
  //     sender: 'bot',
  //     text: "To restrict access to an endpoint, you can specify role-based access rules as annotations for the endpoint class or its individual methods. For example, you can use the `@RolesAllowed` annotation to restrict access to only users with a specific role. Here's an example:\n" +
  //       "\n" +
  //       "```java\n" +
  //       "@Endpoint\n" +
  //       "public class MyEndpoint {\n" +
  //       "  @RolesAllowed(\"ROLE_ADMIN\")\n" +
  //       "  public void adminOnlyMethod() {\n" +
  //       "    // Only users with admin role can access\n" +
  //       "  }\n" +
  //       "}\n" +
  //       "```\n" +
  //       "\n" +
  //       "In the above example, the `adminOnlyMethod()` method can only be accessed by users with the `ROLE_ADMIN` role. If a user without this role tries to access the method, they will be denied access.\n" +
  //       "\n" +
  //       "You can also use the `@PermitAll` annotation to allow any authenticated user to access a method, or the `@AnonymousAllowed` annotation to allow unauthenticated requests."
  //   }
  // ]);
  const chatContainerRef = useRef<HTMLDivElement>(null);


  // Scroll to bottom when new message is added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="h-full overflow-y-auto" ref={chatContainerRef}>
      {messages.map((message, index) => (
        <ChatMessage key={index} message={message.text} sender={message.sender}/>
      ))}
    </div>
  );
}
