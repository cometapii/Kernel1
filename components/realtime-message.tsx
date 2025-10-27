"use client";

import { memo } from "react";
import { PreviewMessage, type Message } from "./message";

type RealtimeMessageProps = {
  message: Message;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
  isLoading: boolean;
};

export const RealtimeMessage = memo(function RealtimeMessage(props: RealtimeMessageProps) {
  return <PreviewMessage {...props} />;
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.status === nextProps.status &&
    prevProps.isLatestMessage === nextProps.isLatestMessage &&
    prevProps.isLoading === nextProps.isLoading &&
    JSON.stringify(prevProps.message.parts) === JSON.stringify(nextProps.message.parts)
  );
});
