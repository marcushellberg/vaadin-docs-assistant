import {ChatCompletionRequestMessage, Configuration, OpenAIApi} from 'openai';
import { createParser, ParsedEvent, ReconnectInterval} from "eventsource-parser";

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY});
const openai = new OpenAIApi(configuration);

export async function moderate(messages: ChatCompletionRequestMessage[]) {
  const moderationResponses = await Promise.all(
    messages.map(message => openai.createModeration({input: message.content}))
  );

  moderationResponses.forEach(response => {
    const [results] = response.data.results;
    if(results.flagged) throw new Error('Flagged content');
  });
}

export async function createEmbedding(text: string) {
  const response = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input: text
  });
  const [{embedding }] = response.data.data;

  return embedding;
}

export async function createChatCompletion(
  messages: ChatCompletionRequestMessage[],
  model: string = 'gpt-3.5-turbo',
  maxTokens: number = 1024
) {
  const completion = await openai.createChatCompletion({
    model,
    max_tokens: maxTokens,
    temperature: 0,
    messages
  });
  const [{message}] = completion.data.choices;

  if(!message) throw new Error('No message returned from OpenAI');
  return message;
}

export async function streamChatCompletion(
  messages: ChatCompletionRequestMessage[],
  model: string = 'gpt-3.5-turbo',
  maxTokens: number = 1024
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let counter = 0;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0,
      messages,
      stream: true
    })
  });

  const stream = new ReadableStream({
    async start(controller) {
      // callback
      function onParse(event: ParsedEvent | ReconnectInterval) {
        if (event.type === "event") {
          const data = event.data;
          // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
          if (data === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta?.content || "";
            if (counter < 2 && (text.match(/\n/) || []).length) {
              // this is a prefix character (i.e., "\n\n"), do nothing
              return;
            }
            console.log(`Received: ${text}`);
            // Encode into UInt8 array
            const queue = encoder.encode(text);
            controller.enqueue(queue);
            counter++;
          } catch (e) {
            // maybe parse error
            controller.error(e);
          }
        }
      }

      // stream response (SSE) from OpenAI may be fragmented into multiple chunks
      // this ensures we properly read chunks and invoke an event for each SSE event stream
      const parser = createParser(onParse);
      // https://web.dev/streams/#asynchronous-iteration
      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
}