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

const MAX_RESPONSE_TOKENS = 1024;

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

async function getContextString(sections: string[], maxContextTokens: number = 2048) {
  let tokenCount = 0;
  let contextText = '';
  for (const section of sections) {
    tokenCount += await countTokens(section);
    if (tokenCount > maxContextTokens) break;

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
async function capMessages(
  initMessages: ChatCompletionRequestMessage[],
  historyMessages: ChatCompletionRequestMessage[]
) {
  const availableTokens = MAX_TOKENS - MAX_RESPONSE_TOKENS;
  const cappedHistoryMessages = [...historyMessages]
  let tokenCount =
    await getChatRequestTokenCount([...initMessages, ...cappedHistoryMessages])

  console.log(`Capping messages. Starting at ${tokenCount} tokens (max: ${availableTokens})`);
  console.log(JSON.stringify({
    initMessages,
    cappedHistoryMessages
  }, null, 2))

  // Remove earlier history messages until we fit
  while (tokenCount >= availableTokens) {
    if(cappedHistoryMessages.length === 1) throw new Error('Only user question left, cannot remove more messages');

    cappedHistoryMessages.shift()
    tokenCount =
      await getChatRequestTokenCount([...initMessages, ...cappedHistoryMessages])
  }

  return [...initMessages, ...cappedHistoryMessages]
}


async function getMessagesWithContext(messages: ChatCompletionRequestMessage[], frontend: string) {

  // Ensure that there are only messages from the user and assistant, trim input
  const historyMessages = sanitizeMessages(messages);

  // Send all messages to OpenAI for moderation
  // Throws exception if flagged -> should be handled properly in a real app.
  await moderate(historyMessages);

  // Extract the last user message to get the question
  const [userMessage] = historyMessages.filter(({role}) => role === ChatCompletionRequestMessageRoleEnum.User).slice(-1)

  // Create an embedding for the user's question
  const embedding = await createEmbedding(userMessage.content);

  // Find the most similar documents to the user's question
  const docSections = await findSimilarDocuments(embedding, 10, frontend);

  // Get at most 1536 tokens of documentation as context
  // TODO: take the history into account as well?
  const contextString = await getContextString(docSections, 1536);

  // The initial messages sets up the context and rules
  const initMessages: ChatCompletionRequestMessage[] = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: oneLine`
            You are a helpful AI assistant. You love to help developers! 
            Answer the user's question using information from the 
            documentation.
          `
    },
    {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: codeBlock`
          Here is the documentation:
          ===
          ${contextString}
          ===
        `
    },
    {
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: codeBlock`
          ${oneLine`
            Answer all future questions using only the above        
            documentation.
          `}
          ${oneLine`
            You must also follow the below rules when answering:
          `}
          ${oneLine`
            - Do not make up answers that are not provided 
              in the documentation 
          `}
          ${oneLine`
            - If you are unsure and the answer is not explicitly 
              written in the documentation context, say 
              "Sorry, I don't know how to help with that"
          `}
          ${oneLine`
            - Prefer splitting your response into multiple paragraphs
          `}
          ${oneLine`
            - Output as markdown
          `}
          ${oneLine`
            - Always include code snippets if available
          `}
        `
    }
  ];

  // Cap the messages to fit the max token count, removing earlier messages if necessary
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
