import {PineconeClient} from '@pinecone-database/pinecone';

const pinecone = new PineconeClient();
let initialized = false;

async function getIndex() {
  if(!initialized) {
    await pinecone.init({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT!,
    });
    initialized = true;
  }
  return pinecone.Index(process.env.PINECONE_INDEX!);
}

/**
 * Fetches the {numResults} most similar documents to the given embedding.
 * @param embedding
 * @param numResults
 */
export async function findSimilarDocuments(embedding: number[], maxResults: number): Promise<string[]> {
  const index = await getIndex();
  const searchResult = await index.query({
    queryRequest: {
      vector: embedding,
      topK: maxResults,
      includeMetadata: true
    }
  });

  const { matches } = searchResult;
  if(!matches) return [];

  return matches.map((match) => {
    if (match.metadata && 'text' in match.metadata) {
      return match.metadata.text as string;
    } else {
      return '';
    }
  }).filter((doc) => doc !== '');
}