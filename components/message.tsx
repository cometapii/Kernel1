"use client";

import type { ComponentType } from "react";
import { useEffect, useRef, memo } from "react";
import { Markdown } from "./markdown";
import { ABORTED, cn } from "@/lib/utils";
import {
  Camera,
  CheckCircle,
  CircleSlash,
  Clock,
  Keyboard,
  Loader2,
  MousePointer,
  MousePointerClick,
  ScrollText,
} from "lucide-react";

const PressKeyIcon = ({ className }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M10.8828 9.61914L11.043 9.66309L17.5928 11.9746C18.5062 12.297 18.5682 13.565 17.6904 13.9746L15.1562 15.1562L13.9746 17.6904C13.5906 18.5132 12.4525 18.5107 12.0459 17.7549L11.9746 17.5928L9.66309 11.043C9.37952 10.2395 10.087 9.46376 10.8828 9.61914ZM13.0264 16.5771L13.9902 14.5127L14.0342 14.4287C14.1447 14.2377 14.3114 14.0842 14.5127 13.9902L16.5771 13.0264L11.0889 11.0889L13.0264 16.5771Z"/>
    <path d="M11.877 2.66797C12.6428 2.66797 13.2514 2.6677 13.7432 2.70117C14.2406 2.73507 14.6684 2.80642 15.0684 2.97168C16.0498 3.37749 16.8295 4.15725 17.2354 5.13867C17.4007 5.53864 17.4719 5.9664 17.5059 6.46387C17.5393 6.95561 17.5391 7.56423 17.5391 8.33008C17.5389 8.6972 17.2412 8.99512 16.874 8.99512C16.507 8.99499 16.2092 8.69712 16.209 8.33008C16.209 7.5461 16.2084 6.99077 16.1787 6.55469C16.1494 6.12491 16.0941 5.85875 16.0068 5.64746C15.7359 4.99227 15.2148 4.47101 14.5596 4.2002C14.3483 4.11298 14.0821 4.05758 13.6523 4.02832C13.2163 3.99864 12.6609 3.99805 11.877 3.99805H8.45703C7.513 3.99805 6.84463 3.99834 6.32227 4.04102C5.80769 4.08307 5.4932 4.16316 5.24609 4.28906C4.74409 4.54487 4.33589 4.95307 4.08008 5.45508C3.95417 5.70219 3.87409 6.01668 3.83203 6.53125C3.78936 7.05361 3.78906 7.72198 3.78906 8.66602V11.4609C3.78906 12.344 3.78969 12.9693 3.82715 13.459C3.8641 13.9416 3.9345 14.2387 4.04492 14.4727C4.30898 15.0316 4.75938 15.4821 5.31836 15.7461C5.55226 15.8565 5.8487 15.9269 6.33105 15.9639C6.57587 15.9826 6.85484 15.9913 7.18262 15.9961L8.33008 16.001L8.46387 16.0146C8.76669 16.0766 8.99485 16.3449 8.99512 16.666C8.99512 16.9873 8.76681 17.2553 8.46387 17.3174L8.33008 17.3311L7.16309 17.3262C6.81513 17.321 6.5056 17.3102 6.22949 17.2891C5.67023 17.2462 5.19176 17.1568 4.75 16.9482C3.91222 16.5525 3.23744 15.8779 2.8418 15.04C2.63332 14.5983 2.54379 14.1198 2.50098 13.5605C2.45768 13.0008 2.45801 12.3082 2.45801 11.4395V8.64551C2.45801 7.73098 2.45768 7.01341 2.50879 6.43652C2.5606 5.85015 2.66891 5.35552 2.89844 4.90234C3.29401 4.12305 3.92402 3.49304 4.7033 3.09747C5.15648 2.86794 5.65112 2.75963 6.23745 2.70782C6.81434 2.65671 7.53191 2.65704 8.44648 2.65704H11.877Z"/>
  </svg>
);

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts?: Array<
    | { type: "text"; text: string }
    | {
        type: "tool-invocation";
        toolInvocation: {
          toolCallId: string;
          toolName?: string;
          state: "streaming" | "call" | "result";
          args?: Record<string, any>;
          argsText?: string;
          result?: any;
        };
      }
  >;
};

type PreviewMessageProps = {
  message: Message;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  isLoading: boolean;
};

type ComputerActionDescriptor = {
  label: string;
  detail?: string;
  icon: ComponentType<{ className?: string }> | null;
  showSkeleton?: boolean;
};

const streamingSpinner = (
  <Loader2 className="h-4 w-4 animate-spin text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
);

const idleSpinner = (
  <Loader2 className="h-4 w-4 animate-spin text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
);

const abortedIcon = (
  <CircleSlash className="h-4 w-4 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
);

const completedIcon = (
  <CheckCircle className="h-4 w-4 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
);

function formatCoordinate(value?: number[]) {
  if (!value || value.length < 2) return undefined;
  return `(${value[0]}, ${value[1]})`;
}

function describeComputerAction(part: NonNullable<Message["parts"]>[number] & { type: "tool-invocation" }): ComputerActionDescriptor {
  const { args = {}, argsText, state } = part.toolInvocation;
  const action: string | undefined = args?.action;

  if (!action && state === "streaming") {
    if (argsText) {
      return {
        label: "Analyzing action",
        detail: argsText.slice(0, 50),
        icon: Loader2,
      };
    }
    return {
      label: "Preparing action",
      icon: Loader2,
      showSkeleton: false,
    };
  }

  switch (action) {
    case "screenshot":
      return { label: "Taking screenshot", icon: Camera };
    case "left_click":
      return {
        label: "Left click",
        detail: formatCoordinate(args?.coordinate) ?? (argsText ? "(streaming...)" : undefined),
        icon: MousePointer,
      };
    case "right_click":
      return {
        label: "Right click",
        detail: formatCoordinate(args?.coordinate) ?? (argsText ? "(streaming...)" : undefined),
        icon: MousePointerClick,
      };
    case "double_click":
      return {
        label: "Double click",
        detail: formatCoordinate(args?.coordinate) ?? (argsText ? "(streaming...)" : undefined),
        icon: MousePointerClick,
      };
    case "mouse_move":
      return {
        label: "Move mouse",
        detail: formatCoordinate(args?.coordinate) ?? (argsText ? "(streaming...)" : undefined),
        icon: MousePointer,
      };
    case "type":
      return {
        label: "Typing",
        detail: args?.text ? `"${args.text}"` : argsText ? "(streaming...)" : undefined,
        icon: Keyboard,
      };
    case "key":
      return {
        label: "Pressing key",
        detail: args?.text ? `"${args.text}"` : argsText ? "(streaming...)" : undefined,
        icon: PressKeyIcon,
      };
    case "wait":
      return {
        label: "Waiting",
        detail: args?.duration ? `${args.duration} seconds` : argsText ? "(streaming...)" : undefined,
        icon: Clock,
      };
    case "scroll":
      return {
        label: "Scrolling",
        detail:
          args?.scroll_direction && args?.scroll_amount
            ? `${args.scroll_direction} by ${args.scroll_amount}`
            : argsText
              ? "(streaming...)"
              : undefined,
        icon: ScrollText,
      };
    case "left_click_drag":
      return {
        label: "Dragging",
        detail:
          args?.start_coordinate && args?.coordinate
            ? `${formatCoordinate(args.start_coordinate)} → ${formatCoordinate(args.coordinate)}`
            : argsText
              ? "(streaming...)"
              : undefined,
        icon: MousePointer,
      };
    default:
      return {
        label: action ?? "Computer action",
        detail: argsText ? argsText.slice(0, 60) : undefined,
        icon: Loader2,
      };
  }
}

function renderInvocationStatus(
  state: "streaming" | "call" | "result",
  isLatestMessage: boolean,
  chatStatus: PreviewMessageProps["status"],
  result?: any,
) {
  if (state === "streaming") {
    return streamingSpinner;
  }

  if (state === "call") {
    return isLatestMessage && chatStatus !== "ready" ? idleSpinner : <div className="h-4 w-4 bg-zinc-400 dark:bg-zinc-500 rounded-full" aria-hidden="true" />;
  }

  if (state === "result") {
    if (result === ABORTED || result?.status === "aborted") {
      return abortedIcon;
    }
    return completedIcon;
  }

  return null;
}

const ComputerInvocation = memo(function ComputerInvocation({
  part,
  isLatestMessage,
  status,
}: {
  part: Extract<NonNullable<Message["parts"]>[number], { type: "tool-invocation" }>;
  isLatestMessage: boolean;
  status: PreviewMessageProps["status"];
}) {
  const descriptor = describeComputerAction(part);
  const IconComponent = descriptor.icon;
  const { state, result } = part.toolInvocation;
  const imgRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = () => {
    if (imgRef.current) {
      imgRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  return (
    <div className="flex flex-col gap-3 px-3.5 py-3" style={{ backgroundColor: 'var(--user-bubble-bg)', borderRadius: '12px' }}>
      <div className="flex items-center gap-2.5">
        {IconComponent ? <IconComponent className="h-[18px] w-[18px] shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" /> : null}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[13px] text-zinc-800 dark:text-zinc-100">{descriptor.label}</span>
            {descriptor.detail ? (
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{descriptor.detail}</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-center shrink-0">
          {renderInvocationStatus(state, isLatestMessage, status, result)}
        </div>
      </div>

      {state === "result" && result?.type === "image" && result?.data ? (
        <div className="overflow-hidden rounded-md -mx-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={`data:image/png;base64,${result.data}`}
            alt="Screenshot"
            className="w-full object-contain"
            onLoad={handleImageLoad}
          />
        </div>
      ) : null}
    </div>
  );
});

function BashInvocation({
  part,
  isLatestMessage,
  status,
}: {
  part: Extract<NonNullable<Message["parts"]>[number], { type: "tool-invocation" }>;
  isLatestMessage: boolean;
  status: PreviewMessageProps["status"];
}) {
  const { args = {}, argsText, state, result } = part.toolInvocation;
  const command = args?.command as string | undefined;
  const displayCommand = argsText?.trim()?.length
    ? argsText.trim().slice(0, 80)
    : command
      ? command.slice(0, 80)
      : "...";

  const statusIcon = renderInvocationStatus(state, isLatestMessage, status, result);

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ backgroundColor: 'var(--user-bubble-bg)', borderRadius: '12px' }}>
      <ScrollText className="h-[18px] w-[18px] shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-zinc-800 dark:text-zinc-100">
            {state === "streaming" ? "Generating command" : "Running command"}
          </span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{displayCommand}</span>
        </div>
      </div>
      <div className="flex items-center justify-center shrink-0">{statusIcon}</div>
    </div>
  );
}

function GenericInvocation({
  part,
  isLatestMessage,
  status,
}: {
  part: Extract<NonNullable<Message["parts"]>[number], { type: "tool-invocation" }>;
  isLatestMessage: boolean;
  status: PreviewMessageProps["status"];
}) {
  const { toolName = "tool", state, args, result } = part.toolInvocation;
  const statusIcon = renderInvocationStatus(state, isLatestMessage, status, result);

  return (
    <div className="px-3.5 py-3" style={{ backgroundColor: 'var(--user-bubble-bg)', borderRadius: '12px' }}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{toolName}</div>
        <div className="ml-auto flex items-center justify-center shrink-0">{statusIcon}</div>
      </div>
      <pre className="overflow-x-auto rounded-md bg-zinc-100/40 px-2.5 py-2 text-[11px] leading-relaxed text-zinc-700 dark:bg-zinc-900/20 dark:text-zinc-300">
        {JSON.stringify(args, null, 2)}
      </pre>
    </div>
  );
}

function renderToolInvocation(part: Extract<NonNullable<Message["parts"]>[number], { type: "tool-invocation" }>, props: PreviewMessageProps) {
  const toolName = part.toolInvocation.toolName;

  if (toolName === "computer" || (!toolName && part.toolInvocation.args?.action)) {
    return <ComputerInvocation part={part} isLatestMessage={props.isLatestMessage} status={props.status} />;
  }

  if (toolName === "bash" || (!toolName && part.toolInvocation.args?.command)) {
    return <BashInvocation part={part} isLatestMessage={props.isLatestMessage} status={props.status} />;
  }

  return <GenericInvocation part={part} isLatestMessage={props.isLatestMessage} status={props.status} />;
}

export function PreviewMessage(props: PreviewMessageProps) {
  const { message } = props;

  const noColumnsStyle = {
    columnCount: 1,
    columns: 'auto',
    columnWidth: 'auto',
    MozColumnCount: 1,
    WebkitColumnCount: 1,
    display: 'block',
  };


  // Jeśli wiadomość ma części, renderuj je wszystkie BEZ GRUPOWANIA
  if (message.parts && message.parts.length > 0) {
    // Każda część jako osobny element - NIE grupuj w jeden div
    return (
      <>
        {message.parts.map((part, index) => {
          if (part.type === "tool-invocation") {
            return <div key={`${message.id}-${index}`} className="group/message w-full" data-role={message.role} style={noColumnsStyle}>{renderToolInvocation(part, props)}</div>;
          } else if (part.type === "text") {
            return (
              <div key={`${message.id}-${index}`} className="group/message w-full" data-role={message.role} style={noColumnsStyle}>
                {message.role === "user" ? (
                  <div className="flex justify-end items-start">
                    <span className="user-message-bubble">
                      {part.text}
                    </span>
                  </div>
                ) : (
                  <div className="flex">
                    <div className="w-full break-words max-w-full" style={noColumnsStyle}>
                      <Markdown>{part.text}</Markdown>
                    </div>
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
      </>
    );
  }

  // Dla zwykłych wiadomości tekstowych (bez części) - obsługa streamingu treści
  return (
    <div className="group/message w-full" data-role={message.role} style={noColumnsStyle}>
      {message.role === "user" ? (
        <div className="flex justify-end items-start">
          <span className="user-message-bubble">
            {message.content}
          </span>
        </div>
      ) : (
        <div className="flex">
          <div className="w-full break-words max-w-full" style={noColumnsStyle}>
            <Markdown>{message.content}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
