"use client";
import { MessageCircleCode } from "lucide-react";
import { useState } from "react";
import ChatModal from "@/plugins/chat/modals/chat-modal";

export function ChatIcon() {
  const [showChat, setShowChat] = useState(false);

  function toggleChat() {
    setShowChat(!showChat);
  }

  return (
    <>
      <div
        className="fixed bottom-16 right-4 z-50 cursor-pointer hover:scale-110 transition-transform duration-100 ease-in-out"
        onClick={toggleChat}
      >
        <div className="rounded-full bg-background p-4 hover:bg-blue-500 border-2 border-gray shadow-xl flex justify-center items-center w-16 h-16">
          <MessageCircleCode className="w-8 h-8 text-foreground" />
        </div>
      </div>
      <ChatModal showChat={showChat} setShowChat={setShowChat} />
    </>
  );
}
