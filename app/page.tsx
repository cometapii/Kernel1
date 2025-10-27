"use client";

import { RealtimeMessage } from "@/components/realtime-message";
import { getDesktopURL } from "@/lib/e2b/utils";
import { useScrollToBottom } from "@/lib/use-scroll-to-bottom";
import { useRawStreaming } from "@/lib/use-raw-streaming";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Input } from "@/components/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AISDKLogo } from "@/components/icons";
import { PromptSuggestions } from "@/components/prompt-suggestions";
import { ABORTED } from "@/lib/utils";

export default function Chat() {
  const [desktopContainerRef, desktopEndRef] = useScrollToBottom();
  const [mobileContainerRef, mobileEndRef] = useScrollToBottom();
  const [isDesktopView, setIsDesktopView] = useState(false);

  const [isInitializing, setIsInitializing] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    isStreaming,
    stop: originalStop,
    send,
  } = useRawStreaming({
    api: "/api/chat",
    body: {
      sandboxId,
    },
    onError: (error) => {
      console.error(error);
      toast.error("There was an error", {
        description: "Please try again later.",
        richColors: true,
        position: "top-center",
      });
    },
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const stop = useCallback(() => {
    setIsSubmitted(false);
    originalStop();
  }, [originalStop]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, [setInput]);

  const handleFormSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || isInitializing) return;
    setIsSubmitted(true);
    handleSubmit(e);
  }, [input, isStreaming, isInitializing, handleSubmit]);

  // Reset submitted state when streaming starts or ends
  useEffect(() => {
    if (isStreaming) {
      setIsSubmitted(false); // Reset when streaming actually starts
    }
  }, [isStreaming]);

  const isLoading = useMemo(() => isStreaming || isSubmitted, [isStreaming, isSubmitted]);
  const status = useMemo(() => isStreaming ? "streaming" : isSubmitted ? "submitted" : "ready", [isStreaming, isSubmitted]);

  const refreshDesktop = useCallback(async () => {
    try {
      setIsInitializing(true);
      const { streamUrl, id } = await getDesktopURL(sandboxId || undefined);
      setStreamUrl(streamUrl);
      setSandboxId(id);
    } catch (err) {
      console.error("Failed to refresh desktop:", err);
    } finally {
      setIsInitializing(false);
    }
  }, [sandboxId]);

  const handlePromptSubmit = useCallback((prompt: string) => {
    setIsSubmitted(true);
    send(prompt);
  }, [send]);

  // Kill desktop on page close
  useEffect(() => {
    if (!sandboxId) return;

    // Function to kill the desktop - just one method to reduce duplicates
    const killDesktop = () => {
      if (!sandboxId) return;

      // Use sendBeacon which is best supported across browsers
      navigator.sendBeacon(
        `/api/kill-desktop?sandboxId=${encodeURIComponent(sandboxId)}`,
      );
    };

    // Detect iOS / Safari
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // Choose exactly ONE event handler based on the browser
    if (isIOS || isSafari) {
      // For Safari on iOS, use pagehide which is most reliable
      window.addEventListener("pagehide", killDesktop);

      return () => {
        window.removeEventListener("pagehide", killDesktop);
        // Also kill desktop when component unmounts
        killDesktop();
      };
    } else {
      // For all other browsers, use beforeunload
      window.addEventListener("beforeunload", killDesktop);

      return () => {
        window.removeEventListener("beforeunload", killDesktop);
        // Also kill desktop when component unmounts
        killDesktop();
      };
    }
  }, [sandboxId]);

  useEffect(() => {
    const checkViewport = () => {
      setIsDesktopView(window.innerWidth >= 1280);
    };
    
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setIsInitializing(true);
        const { streamUrl, id } = await getDesktopURL(sandboxId ?? undefined);
        setStreamUrl(streamUrl);
        setSandboxId(id);
      } catch (err) {
        console.error("Failed to initialize desktop:", err);
        toast.error("Failed to initialize desktop");
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  return (
    <div className="flex h-dvh relative">
      {isDesktopView ? (
        <div className="w-full flex h-full">
          <div className="w-96 flex flex-col border-r border-border">
            <div className="bg-background py-2 px-4 flex justify-between items-center">
              <AISDKLogo />
            </div>

            <div
              className="flex-1 space-y-6 py-4 overflow-y-auto px-4"
              ref={desktopContainerRef}
            >
              {messages.map((message, i) => (
                <RealtimeMessage
                  message={message}
                  key={message.id}
                  isLoading={isLoading}
                  status={status}
                  isLatestMessage={i === messages.length - 1}
                />
              ))}
              <div ref={desktopEndRef} className="pb-2" />
            </div>

            {messages.length === 0 && (
              <PromptSuggestions
                disabled={isInitializing}
                submitPrompt={handlePromptSubmit}
              />
            )}
            <div className="bg-background">
              <form onSubmit={handleFormSubmit} className="p-4">
                <Input
                  handleInputChange={handleInputChange}
                  input={input}
                  isInitializing={isInitializing}
                  isLoading={isLoading}
                  status={status}
                  stop={stop}
                />
              </form>
            </div>
          </div>

          <div className="flex-1 bg-black relative flex items-center justify-center">
            {streamUrl ? (
              <>
                <iframe
                  src={streamUrl}
                  className="w-full h-full"
                  style={{
                    transformOrigin: "center",
                    width: "100%",
                    height: "100%",
                  }}
                  allow="autoplay"
                />
                <Button
                  onClick={refreshDesktop}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded text-sm z-10"
                  disabled={isInitializing}
                >
                  {isInitializing ? "Creating desktop..." : "New desktop"}
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                {isInitializing
                  ? "Initializing desktop..."
                  : "Loading stream..."}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col">
          <div className="bg-background py-2 px-4 flex justify-between items-center">
            <AISDKLogo />
          </div>

          <div
            className="flex-1 space-y-6 py-4 overflow-y-auto px-4"
            ref={mobileContainerRef}
          >
            {messages.map((message, i) => (
              <RealtimeMessage
                message={message}
                key={message.id}
                isLoading={isLoading}
                status={status}
                isLatestMessage={i === messages.length - 1}
              />
            ))}
            <div ref={mobileEndRef} className="pb-2" />
          </div>

          {messages.length === 0 && (
            <PromptSuggestions
              disabled={isInitializing}
              submitPrompt={handlePromptSubmit}
            />
          )}
          <div className="bg-background">
            <form onSubmit={handleFormSubmit} className="p-4">
              <Input
                handleInputChange={handleInputChange}
                input={input}
                isInitializing={isInitializing}
                isLoading={isLoading}
                status={status}
                stop={stop}
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
