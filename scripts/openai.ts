import {ChatCompletionRequestMessage, Configuration, OpenAIApi} from 'openai';

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