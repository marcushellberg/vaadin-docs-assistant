import {QueryResponse} from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/index.js";

export async function findSimilarDocuments(embedding: number[], maxResults: number): Promise<string[]> {

  const result = await fetch('https://docs-56ee546.svc.us-west1-gcp.pinecone.io/query', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'Api-Key': process.env.PINECONE_API_KEY!
    },
    body: JSON.stringify({
      vector: embedding,
      topK: maxResults,
      includeMetadata: true
    })
  });

  const { matches } = await result.json() as QueryResponse;
  if(!matches) return [];

  return matches.map((match) => {
    if (match.metadata && 'text' in match.metadata) {
      return match.metadata.text as string;
    } else {
      return '';
    }
  }).filter((doc) => doc !== '');
}