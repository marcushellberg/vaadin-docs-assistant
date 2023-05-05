import {ChatCompletionRequestMessage} from "openai";
// @ts-expect-error
import wasm from "@dqbd/tiktoken/lite/tiktoken_bg.wasm?module";
import model from "@dqbd/tiktoken/encoders/cl100k_base.json";
import {init, Tiktoken} from "@dqbd/tiktoken/lite/init";

export const MAX_TOKENS = 4096;
let _tokenizer: Tiktoken;


async function getTokenizer() {
  if (!_tokenizer) {
    await init(async (imports) => {
      return WebAssembly.instantiate(wasm, imports)
    });
    _tokenizer = new Tiktoken(
      model.bpe_ranks,
      model.special_tokens,
      model.pat_str
    );
  }
  return _tokenizer;
}

export async function countTokens(text: string) {
  if(!text) return 0;
  const tokenizer = await getTokenizer();
  return tokenizer.encode(text).length;
}

/**
 * Count the tokens for multi-message chat completion requests
 */
export async function getChatRequestTokenCount(messages: ChatCompletionRequestMessage[]) {
  const tokensPerRequest = 3 // every reply is primed with <|im_start|>assistant<|im_sep|>

  const tokens = await Promise.all(messages.map(message => getMessageTokenCount(message)));
  const numTokens = tokens.reduce((acc, tkns) => acc + tkns, 0)

  return numTokens + tokensPerRequest;
}

/**
 * Count the tokens for a single message within a chat completion request
 *
 * See "Counting tokens for chat API calls"
 * from https://github.com/openai/openai-cookbook/blob/834181d5739740eb8380096dac7056c925578d9a/examples/How_to_count_tokens_with_tiktoken.ipynb
 */
export async function getMessageTokenCount(message: ChatCompletionRequestMessage) {
  const tokensPerMessage = 4 // every message follows <|start|>{role/name}\n{content}<|end|>\n
  const tokensPerName = -1 // if there's a name, the role is omitted

  let tokens = tokensPerMessage;

  for(const entry of Object.entries(message)){
    const [key, value] = entry;
    tokens += await countTokens(value);
    if (key === 'name') {
      tokens += tokensPerName
    }
  }

  return tokens;
}
