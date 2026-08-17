"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Send, Users, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStoredParticipantId } from "@/lib/participant-session";
import { Program, Participant, Registration, ProgramMessage } from "@/lib/types";
import TopBar from "@/components/TopBar";
import Lightbox from "@/components/Lightbox";

export default function ProgramChatPage() {
  const { id } = useParams<{ id: string }>();
  const [program, setProgram] = useState<Program | null>(null);
  const [me, setMe] = useState<Participant | null | undefined>(undefined);
  const [registration, setRegistration] = useState<Registration | null | undefined>(undefined);
  const [messages, setMessages] = useState<ProgramMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasMediaConsent, setHasMediaConsent] = useState<boolean | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [agreeMediaNow, setAgreeMediaNow] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("programs").select("*").eq("id", id).single().then(({ data }) => setProgram(data));

    supabase
      .from("program_messages")
      .select("*")
      .eq("program_id", id)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => setMessages(data ?? []));

    const pid = getStoredParticipantId();
    if (!pid) { setMe(null); setRegistration(null); return; }
    supabase.rpc("rpc_get_my_participant", { p_id: pid }).maybeSingle().then(({ data }) => {
      const participant = (data as Participant) ?? null;
      setMe(participant);
      if (participant) {
        supabase
          .rpc("rpc_get_my_registration_for_program", { p_participant_id: participant.id, p_program_id: id })
          .then(({ data: regs }) => setRegistration((regs as Registration[] | null)?.[0] ?? null));
        supabase
          .rpc("rpc_get_my_consent", { p_participant_id: participant.id, p_consent_type: "media_optional" })
          .then(({ data }) => setHasMediaConsent(data ?? false));
      } else {
        setRegistration(null);
      }
    });

    // 실시간 구독 — 다른 참여자가 보낸 메시지가 화면에 바로 뜨도록
    const channel = supabase
      .channel(`program_messages:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "program_messages", filter: `program_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => (prev.some((m) => m.id === (payload.new as ProgramMessage).id) ? prev : [...prev, payload.new as ProgramMessage]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const canChat = !!me && !!registration && registration.status !== "cancelled" && registration.status !== "rejected";
  const needsMediaConsent = !!pendingImage && hasMediaConsent === false;

  const send = async () => {
    if ((!input.trim() && !pendingImage) || !me || sending) return;
    if (needsMediaConsent && !agreeMediaNow) return;
    setSending(true);
    const content = input.trim();
    const file = pendingImage;
    setInput("");
    setPendingImage(null);
    if (fileRef.current) fileRef.current.value = "";

    if (needsMediaConsent && agreeMediaNow) {
      await supabase.from("consents").insert({ participant_id: me.id, consent_type: "media_optional", agreed: true });
      setHasMediaConsent(true);
      setAgreeMediaNow(false);
    }

    let imageUrl: string | null = null;
    if (file) {
      const path = `chat/${id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(path, file);
      if (!upErr) {
        const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }
    }

    const { error } = await supabase.from("program_messages").insert({
      program_id: id,
      participant_id: me.id,
      author_name: me.name,
      content,
      image_url: imageUrl,
    });
    if (error) { setInput(content); setPendingImage(file); } // 실패 시 입력 복구
    setSending(false);
  };

  if (!program || me === undefined || registration === undefined) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FAF6EE" }}>
      <TopBar
        title={`${program.emoji} ${program.title}`}
        backHref={`/programs/${program.id}`}
        right={
          <div className="flex items-center gap-1 text-white/70 text-[11px]">
            <Users size={12} /> 참여자 대화방
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-muted text-center mt-8">아직 대화가 없어요. 첫 메시지를 남겨보세요!</p>
        )}
        {messages.map((m) => {
          const isMe = me && m.participant_id === me.id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                {!isMe && <span className="text-[10px] text-muted mb-0.5 px-1">{m.author_name}</span>}
                {m.image_url && (
                  <button onClick={() => setLightboxSrc(m.image_url)} className="mb-1 rounded-2xl overflow-hidden border border-line max-w-[220px]">
                    <img src={m.image_url} alt="" className="w-full h-auto block" />
                  </button>
                )}
                {m.content && (
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm ${
                      isMe ? "bg-coral text-white rounded-br-sm" : "bg-white border border-line text-ink rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                )}
                <span className="text-[10px] text-muted/70 mt-0.5 px-1">
                  {new Date(m.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line bg-white p-3">
        {canChat ? (
          <div>
            {pendingImage && (
              <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-sand">
                <img src={URL.createObjectURL(pendingImage)} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <span className="text-xs text-muted flex-1 truncate">{pendingImage.name}</span>
                <button onClick={() => { setPendingImage(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-xs text-coralDark">취소</button>
              </div>
            )}
            {needsMediaConsent && (
              <label className="flex items-start gap-2 text-xs text-ink mb-2 p-2.5 rounded-lg bg-sand">
                <input type="checkbox" checked={agreeMediaNow} onChange={(e) => setAgreeMediaNow(e.target.checked)} className="mt-0.5" />
                <span>사진을 대화방에 게시하고 홍보 목적으로 활용하는 것에 동의합니다. (동의해야 사진 전송이 가능해요)</span>
              </label>
            )}
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPendingImage(e.target.files?.[0] ?? null)} />
              <button onClick={() => fileRef.current?.click()} className="w-10 h-10 rounded-full border border-line flex items-center justify-center flex-shrink-0 text-navy">
                <ImageIcon size={16} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="메시지를 입력하세요"
                className="flex-1 border border-line rounded-full px-4 py-2.5 text-sm"
              />
              <button
                onClick={send}
                disabled={(!input.trim() && !pendingImage) || sending || (needsMediaConsent && !agreeMediaNow)}
                className="w-10 h-10 rounded-full bg-coral text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted text-center py-2">
            {me ? "이 프로그램에 신청한 참여자만 대화할 수 있어요." : "로그인 후 대화에 참여할 수 있어요."}
          </p>
        )}
      </div>

      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  );
}
