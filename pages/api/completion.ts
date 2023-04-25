import type {NextApiRequest, NextApiResponse} from 'next'
import {findSimilarDocuments} from "@/scripts/pinecone";
import {codeBlock, oneLine} from 'common-tags';
import {createEmbedding, moderate, streamChatCompletion} from "@/scripts/openai";
import {ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum} from "openai";
// import {getChatRequestTokenCount, getMaxTokenCount, getTokens} from "@/scripts/tokenizer";
import {NextRequest} from "next/server";
import {countTokens, getChatRequestTokenCount, MAX_TOKENS} from "@/scripts/tokenizer";

export const config = {
  runtime: "edge"
};

// This is heavily inspired by the Supabase implementation
// https://github.dev/supabase/supabase/tree/master/apps/docs/scripts

const MAX_RESPONSE_TOKENS = 1500;

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

async function getContextString(sections: string[], maxContextTokens: number = 1500) {
  let tokenCount = 0;
  let contextText = '';
  for(const section of sections) {
    tokenCount += await countTokens(section);
    if(tokenCount > maxContextTokens) break;

    contextText += `${section.trim()}\n---\n`;
  }
  console.log(contextText);
  return contextText;
}


/**
 * Remove context messages until the entire request fits
 * the max total token count for that model.
 *
 * Accounts for both message and completion token counts.
 */
async function capMessages(
  initMessages: ChatCompletionRequestMessage[],
  historyMessages: ChatCompletionRequestMessage[]
) {
  const maxTotalTokenCount = MAX_TOKENS;
  const cappedHistoryMessages = [...historyMessages]
  let tokenCount =
    await getChatRequestTokenCount([...initMessages, ...cappedHistoryMessages]) +
    MAX_RESPONSE_TOKENS

  // Remove earlier history messages until we fit
  while (tokenCount >= maxTotalTokenCount) {
    cappedHistoryMessages.shift()
    tokenCount =
      await getChatRequestTokenCount([...initMessages, ...cappedHistoryMessages]) +
      MAX_RESPONSE_TOKENS
  }

  return [...initMessages, ...cappedHistoryMessages]
}


async function getMessagesWithContext(messages: ChatCompletionRequestMessage[], frontend: string) {
  const historyMessages = sanitizeMessages(messages);

  // send all messages to OpenAI for moderation. Throws exception if flagged.
  await moderate(historyMessages);

  // Extract the last message to get the question
  const [userMessage] = historyMessages.filter(({role}) => role === ChatCompletionRequestMessageRoleEnum.User).slice(-1)

  // Create an embedding for the user's question. Replace newlines with spaces per OpenAI's recommendation.
  const embedding = await createEmbedding(userMessage.content.replace(/\n/g, ' '));

  // Find the most similar documents to the user's question
  const docSections = await findSimilarDocuments(embedding, 10, frontend);

  // Get a string of at most 1500 tokens from the most similar documents
  const contextString = await getContextString(docSections, 1500);

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
            Answer all future questions using only the above documentation.
            You must also follow the below rules when answering:
          `}
          ${oneLine`
            - Do not make up answers that are not provided in the documentation.
          `}
          ${oneLine`
            - Use vaadin- prefixed components whenever available instead of standard HTML elements.
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

  return capMessages(
    initMessages,
    historyMessages
  );
}

export default async function handler(req: NextRequest) {
  // All the non-system messages up until now, including the current question
  const {messages, frontend} = (await req.json()) as {
    messages: ChatCompletionRequestMessage[],
    frontend: string
  };
  const completionMessages = await getMessagesWithContext(messages, frontend);
  const stream = await streamChatCompletion(completionMessages, MAX_RESPONSE_TOKENS);
  return new Response(stream);
}
