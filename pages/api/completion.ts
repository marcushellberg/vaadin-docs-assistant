import type {NextApiRequest, NextApiResponse} from 'next'
import {findSimilarDocuments} from "@/scripts/pinecone";
import {codeBlock, oneLine} from 'common-tags';
import {createChatCompletion, createEmbedding, moderate} from "@/scripts/openai";
import {ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum} from "openai";
import {getChatRequestTokenCount, getMaxTokenCount, tokenizer} from "@/scripts/tokenizer";


// This is heavily inspired by the Supabase implementation
// https://github.dev/supabase/supabase/tree/master/apps/docs/scripts


export interface CompletionRequest extends NextApiRequest {
  body: {
    messages: ChatCompletionRequestMessage[]
  }
}

export interface CompletionResponse {
  message: ChatCompletionRequestMessage
}

function sanitizeMessages(messages: ChatCompletionRequestMessage[]) {
  const messageHistory: ChatCompletionRequestMessage[] = messages.map(({role, content}) => {
    if (role !== ChatCompletionRequestMessageRoleEnum.User && role !== ChatCompletionRequestMessageRoleEnum.Assistant) {
      throw new Error(`Invalid message role '${role}'`)
    }

    return {
      role,
      content: content.trim(),
    }
  })
  return messageHistory;
}

function getContextString(sections: string[], maxTokens: number = 1500) {
  let tokenCount = 0;
  let contextText = '';
  for(const section of sections) {
    tokenCount += tokenizer.encode(section).length;
    if(tokenCount > maxTokens) break;

    contextText += `${section.trim()}\n---\n`;
  }
  return contextText;
}

/**
 * Remove context messages until the entire request fits
 * the max total token count for that model.
 *
 * Accounts for both message and completion token counts.
 */
function capMessages(
  initMessages: ChatCompletionRequestMessage[],
  historyMessages: ChatCompletionRequestMessage[],
  maxCompletionTokenCount: number,
  model: string
) {
  const maxTotalTokenCount = getMaxTokenCount(model)
  const cappedHistoryMessages = [...historyMessages]
  let tokenCount =
    getChatRequestTokenCount([...initMessages, ...cappedHistoryMessages], model) +
    maxCompletionTokenCount

  // Remove earlier history messages until we fit
  while (tokenCount >= maxTotalTokenCount) {
    cappedHistoryMessages.shift()
    tokenCount =
      getChatRequestTokenCount([...initMessages, ...cappedHistoryMessages], model) +
      maxCompletionTokenCount
  }

  return [...initMessages, ...cappedHistoryMessages]
}

export default async function handler(
  req: CompletionRequest,
  res: NextApiResponse<CompletionResponse>
) {
  // All the non-system messages up until now, including the current question
  const {messages} = req.body;

  const historyMessages = sanitizeMessages(messages);

  // send all messages to OpenAI for moderation. Throws exception if flagged.
  await moderate(historyMessages);

  // Extract the last message to get the question
  const [userMessage] = historyMessages.filter(({role}) => role === ChatCompletionRequestMessageRoleEnum.User).slice(-1)

  // Create an embedding for the user's question
  const embedding = await createEmbedding(userMessage.content);

  // Find the most similar documents to the user's question
  const docSections = await findSimilarDocuments(embedding, 10);

  // Get a string of at most 1500 tokens from the most similar documents
  const contextString = getContextString(docSections, 1500);

  // The messages that set up the context for the question
  const initMessages: ChatCompletionRequestMessage[] = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: codeBlock`
          ${oneLine`
            You are a very enthusiastic Hilla AI who loves
            to help people! Given the following information from
            the Hilla documentation, answer the user's question using
            only that information, outputted in markdown format.
          `}
        `
    },
    {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: codeBlock`
          Here is the Hilla documentation:
          ${contextString}
        `
    },
    {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: codeBlock`
          ${oneLine`
            Answer all future questions using only the above documentation and your knowledge about the Google Lit library.
            You must also follow the below rules when answering:
          `}
          ${oneLine`
            - Do not make up answers that are not provided in the documentation.
          `}
          ${oneLine`
            - If you are unsure and the answer is not explicitly written
            in the documentation context, say
            "Sorry, I don't know how to help with that."
          `}
          ${oneLine`
            - Prefer splitting your response into multiple paragraphs.
          `}
          ${oneLine`
            - Output as markdown.
          `}
          ${oneLine`
            - Always include code snippets if available.
          `}
        `
    }
  ];

  const model = 'gpt-3.5-turbo-0301'
  const maxTokens = 1024

  const completionMessages: ChatCompletionRequestMessage[] = capMessages(
    initMessages,
    historyMessages,
    maxTokens,
    model
  );

  const message = await createChatCompletion(completionMessages, model, maxTokens);

  res.status(200).json({message})
}
