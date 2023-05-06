import {ChatCompletionRequestMessage, Configuration, OpenAIApi} from 'openai';
import { createParser, ParsedEvent, ReconnectInterval} from "eventsource-parser";

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY});
const openai = new OpenAIApi(configuration);

export async function moderate(messages: ChatCompletionRequestMessage[]) {

  const moderationResponses = await Promise.all(
    messages.map(async message => {
      const res = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input: message.content
        })
      });
      return res.json();
    }
  )).catch(err => console.error(err));

  moderationResponses?.forEach(response => {
    const [results] = response.results;
    if(results.flagged) throw new Error('Flagged content');
  });
}

export async function createEmbedding(text: string) {

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        // Replace newlines with spaces per OpenAI's recommendation.
        input: text.replace(/\n/g, ' ')
      })
    });
    const json = await response.json();
    const [{embedding}] = json.data;

    return embedding;
  } catch (e) {
    console.error(e);
    throw e;
  }
}


export async function streamChatCompletion(
  messages: ChatCompletionRequestMessage[],
  maxTokens: number = 1024
) {

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let counter = 0;

  try {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      max_tokens: maxTokens,
      temperature: 0,
      messages,
      stream: true
    })
  });

  // See https://vercel.com/blog/gpt-3-app-next-js-vercel-edge-functions#edge-functions-with-streaming
  const stream = new ReadableStream({
    async start(controller) {
      // callback
      function onParse(event: ParsedEvent | ReconnectInterval) {
        if (event.type === "event") {
          const data = event.data;
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

  } catch (e) {
    console.error(e);
    throw e;
  }
}