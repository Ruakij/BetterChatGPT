import { MessageInterface, ModelOptions, TotalTokenUsed } from '@type/chat';

import useStore from '@store/store';

import { Tiktoken } from '@dqbd/tiktoken/lite';
const cl100k_base = await import('@dqbd/tiktoken/encoders/cl100k_base.json');

const encoder = new Tiktoken(
  cl100k_base.bpe_ranks,
  {
    ...cl100k_base.special_tokens,
    '<|im_start|>': 100264,
    '<|im_end|>': 100265,
    '<|im_sep|>': 100266,
  },
  cl100k_base.pat_str
);

// https://github.com/dqbd/tiktoken/issues/23#issuecomment-1483317174
export const getChatGPTEncoding = (
  messages: MessageInterface[],
  model: ModelOptions
) => {
  const isGpt3 = model === 'gpt-3.5-turbo';

  const msgSep = isGpt3 ? '\n' : '';
  const roleSep = isGpt3 ? '\n' : '<|im_sep|>';

  const serialized = [
    messages
      .map(({ role, content }) => {
        return `<|im_start|>${role}${roleSep}${content}<|im_end|>`;
      })
      .join(msgSep),
    `<|im_start|>assistant${roleSep}`,
  ].join(msgSep);

  return encoder.encode(serialized, 'all');
};

const countTokens = (messages: MessageInterface[], model: ModelOptions) => {
  if (messages.length === 0) return 0;
  return getChatGPTEncoding(messages, model).length;
};

export const limitMessageTokens = (
  messages: MessageInterface[],
  limit: number = 4096,
  model: ModelOptions,
  persistSystemMessageCount: number = 1, // Number of system messages to keep
  persistSystemMessageFirst: boolean = true // Whether to keep the first system message
): MessageInterface[] => {
  const limitedMessages: MessageInterface[] = [];
  let tokenCount = 0;
  let systemMessageCount = 0; // variable to track how many system messages have been added

  // Iterate through messages in reverse order, adding them to the limitedMessages array
  // until the token limit is reached
  for (let i = messages.length - 1; i >= 0; i--) {
    const count = countTokens([messages[i]], model);
    if (count + tokenCount > limit) break;
    tokenCount += count;
    limitedMessages.unshift({ ...messages[i] });
    if (messages[i].role === 'system') systemMessageCount++; // increment system message count if the message is from the system
  }

  // Check if persistSystemMessageCount is set
  persistSystemMessageCount -= systemMessageCount
  if (persistSystemMessageCount > 0) {
    // Find the system messages that are not in the limitedMessages array
    const systemMessages = messages
      .slice(0, messages.length - limitedMessages.length)
      .filter((message) => message.role === 'system');

    // Add system messages from the back until the persistSystemMessageCount is reached
    // or the token limit is exceeded
    for (let i = systemMessages.length - 1; i >= 0; i--) {
      const count = countTokens([systemMessages[i]], model);
      if (count + tokenCount > limit) {
        // Remove non-system messages from the back until the system message fits
        while (limitedMessages.length > 0 && count + tokenCount > limit) {
          const removed = limitedMessages.pop() as MessageInterface;
          if (removed.role !== 'system') { // only remove non-system messages
            tokenCount -= countTokens([removed], model);
          }
        }
      }
      tokenCount += count;
      limitedMessages.unshift({ ...systemMessages[i] });
      persistSystemMessageCount--;
      if (persistSystemMessageCount === 0) break;
    }
  }

  // Check if persistSystemMessageFirst is true
  if (persistSystemMessageFirst) {
    // Check if the first message is a system message and if it is not in the limitedMessages array
    const isSystemFirstMessage = messages[0]?.role === 'system';
    const isFirstMessageIncluded = messages[0] === limitedMessages[0];
    if (isSystemFirstMessage && !isFirstMessageIncluded) {
      // Check if the first message can fit within the limit
      const count = countTokens([messages[0]], model);
      if (count + tokenCount > limit) {
        // Remove non-system messages from the back until the first message fits
        while (limitedMessages.length > 0 && count + tokenCount > limit) {
          const removed = limitedMessages.pop() as MessageInterface;
          if (removed.role !== 'system') { // only remove non-system messages
            tokenCount -= countTokens([removed], model);
          }
        }
      }
      tokenCount += count;
      limitedMessages.unshift({ ...messages[0] });
    }
  }

  return limitedMessages;
};

export const updateTotalTokenUsed = (
  model: ModelOptions,
  promptMessages: MessageInterface[],
  completionMessage: MessageInterface
) => {
  const setTotalTokenUsed = useStore.getState().setTotalTokenUsed;
  const updatedTotalTokenUsed: TotalTokenUsed = JSON.parse(
    JSON.stringify(useStore.getState().totalTokenUsed)
  );

  const newPromptTokens = countTokens(promptMessages, model);
  const newCompletionTokens = countTokens([completionMessage], model);
  const { promptTokens = 0, completionTokens = 0 } =
    updatedTotalTokenUsed[model] ?? {};

  updatedTotalTokenUsed[model] = {
    promptTokens: promptTokens + newPromptTokens,
    completionTokens: completionTokens + newCompletionTokens,
  };
  setTotalTokenUsed(updatedTotalTokenUsed);
};

export default countTokens;
