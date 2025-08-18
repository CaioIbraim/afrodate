"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { v4 as uuidv4 } from "uuid";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import type { RealtimeChannel } from "@supabase/realtime-js";

const MySwal = withReactContent(Swal);

interface Match {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  status: string;
  is_read: boolean;
  created_at: string;
}

export default function ChatPage() {
  const { profile, user, isLoading: userLoading } = useUser();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    async function initRealtimeAuth() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await supabase.realtime.setAuth(data.session.access_token);
      }
    }
    initRealtimeAuth();
  }, []);

  const fetchMatches = useCallback(async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from("matches")
        .select("profile1:profiles!profile1_id(id, name, avatar_url), profile2:profiles!profile2_id(id, name, avatar_url)")
        .or(`profile1_id.eq.${profile.id},profile2_id.eq.${profile.id}`);
      if (error) throw error;
      const matchedProfiles = data?.map((match: any) => match.profile1.id === profile.id ? match.profile2 : match.profile1) || [];
      setMatches(matchedProfiles);
    } catch (error) {
      console.log("Erro ao carregar matches:", error);
    }
  }, [profile]);

  const fetchOrCreateConversation = useCallback(async (matchId: string) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase.from("conversations").select("id").eq("match_id", matchId).single();
      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setConversationId(data.id);
        return data.id;
      }
      const { data: insertData, error: insertError } = await supabase.from("conversations").insert({ match_id: matchId, last_message_at: new Date().toISOString() }).select("id").single();
      if (insertError) throw insertError;
      setConversationId(insertData?.id || null);
      return insertData?.id || null;
    } catch (err: any) {
      console.log("Erro na conversa:", err.message);
      return null;
    }
  }, [user]);

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.log("Erro ao carregar mensagens:", err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const markMessagesAsRead = useCallback(async (convId: string) => {
    if (!profile) return;
    setMessages(prevMessages => 
        prevMessages.map(msg => 
            !msg.is_read && msg.receiver_id === profile.id 
                ? { ...msg, is_read: true } 
                : msg
        )
    );
    try {
        await supabase.from("messages").update({ is_read: true, status: 'read' }).eq("conversation_id", convId).eq("receiver_id", profile.id).eq("is_read", false);
    } catch (error) {
        console.log("Erro ao marcar mensagens como lidas:", error);
    }
  }, [profile]);

  const selectMatch = async (match: Match) => {
    setSelectedMatch(match);
    const convId = await fetchOrCreateConversation(match.id);
    if (convId) {
      await fetchMessages(convId);
      await markMessagesAsRead(convId);
    }
  };

  useEffect(() => {
    if (!conversationId || !profile) return;
    const channel = supabase.channel(`messages_conversation_${conversationId}`, { config: { broadcast: { self: false } } });

    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (payload: { new: Message }) => {
      const newMsg = payload.new;
      setMessages((currentMessages) => {
        if (currentMessages.some((msg) => msg.id === newMsg.id)) {
          return currentMessages;
        }
        return [...currentMessages, newMsg];
      });
      if (newMsg.sender_id !== profile.id) {
        markMessagesAsRead(newMsg.conversation_id);
      }
    });

    channel.subscribe((status, error) => {
      if (status === "CHANNEL_ERROR") console.log("Erro no canal realtime:", error);
    });
    realtimeChannelRef.current = channel;
    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [conversationId, profile, markMessagesAsRead]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || !selectedMatch || !profile) return;
    const newMessage: Message = { id: uuidv4(), conversation_id: conversationId, sender_id: profile.id, receiver_id: selectedMatch.id, content: input.trim(), status: "sent", is_read: false, created_at: new Date().toISOString() };
    setMessages((currentMessages) => [...currentMessages, newMessage]);
    setInput("");
    try {
      const { error } = await supabase.from("messages").insert(newMessage);
      if (error) throw error;
      await supabase.from("conversations").update({ last_message_at: newMessage.created_at, updated_at: newMessage.created_at }).eq("id", conversationId);
    } catch (err: any) {
      console.log("Erro ao enviar mensagem:", err.message);
      setMessages((currentMessages) => currentMessages.filter((msg) => msg.id !== newMessage.id));
      await MySwal.fire("Erro", "Não foi possível enviar a mensagem.", "error");
    }
  };

  if (userLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-cyan-600" /></div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen max-w-7xl mx-auto gap-4 p-4">
      <aside className="w-full md:w-1/3 border rounded shadow p-4 overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl mb-4 font-semibold text-center">Seus Matches</h2>
        {matches.length === 0 && <p className="text-center text-gray-500">Nenhum match ainda.</p>}
        <ul>
          {matches.map((match) => (
            <li key={match.id} onClick={() => selectMatch(match)} className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-cyan-100 ${selectedMatch?.id === match.id ? "bg-cyan-200 font-semibold" : ""}`}>
              <img src={match.avatar_url || "/placeholder-image.png"} alt={match.name} className="w-12 h-12 rounded-full object-cover" />
              <span>{match.name}</span>
            </li>
          ))}
        </ul>
      </aside>
      <main className="flex-1 flex flex-col border rounded shadow max-h-[90vh]">
        {selectedMatch ? (
          <>
            <header className="p-4 border-b flex items-center gap-4 bg-cyan-50">
              <img src={selectedMatch.avatar_url || "/placeholder-image.png"} alt={selectedMatch.name} className="w-14 h-14 rounded-full object-cover" />
              <h3 className="text-xl font-semibold">{selectedMatch.name}</h3>
            </header>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {loadingMessages && <Loader2 className="animate-spin w-6 h-6 mx-auto text-cyan-600" />}
              {messages.length === 0 && !loadingMessages && <p className="text-center text-gray-400 mt-8">Nenhuma mensagem ainda.</p>}
              {messages.map((msg) => {
                const isMe = msg.sender_id === profile?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
                    <div className={`max-w-[70%] p-3 rounded-xl whitespace-pre-wrap ${isMe ? "bg-cyan-500 text-white" : "bg-white border border-gray-300"}`}>
                      {msg.content}
                      <div className="text-xs text-gray-200 mt-1 text-right select-none">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {/* Opcional: Adicionar um indicador de leitura */}
                        {isMe && msg.is_read && <span className="ml-2">✓✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="p-4 border-t bg-white flex gap-2">
              <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Digite sua mensagem..." className="flex-1 resize-none border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
              <Button type="submit" disabled={!input.trim()}>Enviar</Button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center flex-grow text-gray-500">Selecione um match para conversar</div>
        )}
      </main>
    </div>
  );
}