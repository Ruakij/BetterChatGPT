import React from 'react';
import useStore from '@store/store';

import Avatar from './Avatar';
import MessageContent from './MessageContent';

import { Role } from '@type/chat';
import RoleSelector from './RoleSelector';

// const backgroundStyle: { [role in Role]: string } = {
//   user: 'dark:bg-gray-800',
//   assistant: 'bg-gray-50 dark:bg-gray-650',
//   system: 'bg-gray-50 dark:bg-gray-650',
// };
const backgroundStyle = ['dark:bg-gray-800', 'bg-gray-50 dark:bg-gray-650'];

const Message = React.memo(
  ({
    role,
    content,
    messageIndex,
    tokenCount,
    inContext,
    preserve,
    sticky = false,
  }: {
    role: Role;
    content: string;
    messageIndex: number;
    tokenCount: number;
    inContext: boolean;
    preserve: boolean;
    sticky?: boolean;
  }) => {
    const hideSideMenu = useStore((state) => state.hideSideMenu);
    const advancedMode = useStore((state) => state.advancedMode);

    return (
      <div
        className={`w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group ${
          backgroundStyle[messageIndex % 2]
        } ${
          inContext
          ? 'opacity-100'
          : 'opacity-25 hover:opacity-100'
        }`}
      >
        <div
          className={`text-base gap-4 md:gap-6 m-auto p-4 md:py-6 flex transition-all ease-in-out md:max-w-5xl lg:max-w-5xl xl:max-w-6xl`}
        >
          <Avatar role={role} />
          <div className='w-[calc(100%-50px)] '>
            {advancedMode && (
              <RoleSelector
                role={role}
                messageIndex={messageIndex}
                sticky={sticky}
              />
            )}
            <MessageContent
              role={role}
              content={content}
              messageIndex={messageIndex}
              tokenCount={tokenCount}
              inContext={inContext}
              sticky={sticky}
              preserve={preserve}
            />
          </div>
        </div>
      </div>
    );
  }
);

export default Message;
