import type { NextApiRequest, NextApiResponse } from 'next'
import { PineconeClient } from '@pinecone-database/pinecone';
import { codeBlock, oneLine } from 'common-tags';
import { Configuration, OpenAIApi } from 'openai';
import {VectorOperationsApi} from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});

const openai = new OpenAIApi(configuration);
const pinecone = new PineconeClient();

let index: VectorOperationsApi;

async function getPineconeIndex() {
  if(!index) {
    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT!,
    });
    index = pinecone.Index(process.env.PINECONE_INDEX!);
  }
  return index;
}
// const index = pinecone.Index(process.env.PINECONE_INDEX!);

async function getEmbedding(text: string) {
  const response = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input: text
  });
  return response.data.data[0].embedding;
}

async function getCompletion(query: string, context: string) {
  const completion = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    max_tokens: 1024,
    temperature: 0,
    messages: [
      {
        role: 'system',
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
        role: 'user',
        content: codeBlock`
          Here is the Supabase documentation:
          ${context}
        `
      },
      {
        role: 'user',
        content: codeBlock`
          ${oneLine`
            Answer all future questions using only the above documentation.
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
      }, {
        role: 'user',
        content: query
      }
    ]
  });
  return completion.data.choices[0].message?.content || '🤷‍♂️';
}

export interface CompletionRequest extends NextApiRequest {
  body: {
    question: string
  }
}

export interface CompletionResponse {
  completion: string
}

export default async function handler(
  req: CompletionRequest,
  res: NextApiResponse<CompletionResponse>
) {
  const { question } = req.body;
  const pineconeIndex = await getPineconeIndex();
  const embedding = await getEmbedding(question);
  const searchResult = await pineconeIndex.query({
    queryRequest: {
      vector: embedding,
      topK: 3,
      includeMetadata: true
    }
  });

  const context = searchResult?.matches?.map((match) => {
    if(match.metadata && 'text' in match.metadata) {
      return match.metadata.text;
    } else {
      return '';
    }
  }).join('\n----\n');

  if(context) {
    const completion = await getCompletion(question, context);
    res.status(200).json({ completion })
  } else {
    res.status(404);
  }

}
