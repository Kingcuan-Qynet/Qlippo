"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getIceServers } from "@/lib/webrtc";
import { Avatar } from "@/components/ui/Avatar";
import type { Profile } from "@/types/database.types";

type SignalPayload =
  | { kind: "offer"; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; sdp: RTCSessionDescriptionInit }
  | { kind: "ice-candidate"; candidate: RTCIceCandidateInit };

/**
 * Peer-to-peer video call. Signaling (who's calling whom, the SDP
 * offer/answer, and ICE candidates) travels over a Supabase Realtime
 * broadcast channel scoped to this call id — nothing here is a general
 * WebRTC signaling server, it's just this one call's channel, torn down
 * when the call ends. The actual audio/video stream never touches
 * Supabase or any server: it flows directly between the two browsers.
 * Nothing is recorded or stored anywhere.
 */
export function CallRoom({
  callId,
  currentUserId,
  otherUser,
  isCaller
}: {
  callId: string;
  currentUserId: string;
  otherUser: Profile;
  isCaller: boolean;
}) {
  const router = useRouter();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const channel = supabase.channel(`call:${callId}`, { config: { broadcast: { self: false } } });

    async function setup() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
        setStatus("connected");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: "broadcast",
            event: "signal",
            payload: { kind: "ice-candidate", candidate: event.candidate.toJSON() } satisfies SignalPayload
          });
        }
      };

      channel
        .on("broadcast", { event: "signal" }, async ({ payload }: { payload: SignalPayload }) => {
          if (payload.kind === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({ type: "broadcast", event: "signal", payload: { kind: "answer", sdp: answer } });
          } else if (payload.kind === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          } else if (payload.kind === "ice-candidate") {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch {
              // Candidate arriving before remote description is set is
              // expected sometimes — safe to ignore.
            }
          }
        })
        .on("broadcast", { event: "hangup" }, () => {
          setStatus("ended");
        })
        .subscribe(async (subscribeStatus) => {
          if (subscribeStatus === "SUBSCRIBED" && isCaller) {
            setStatus("ringing");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channel.send({ type: "broadcast", event: "signal", payload: { kind: "offer", sdp: offer } });
          }
        });
    }

    setup();

    return () => {
      cancelled = true;
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      supabase.removeChannel(channel);
    };
  }, [callId, isCaller]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
  }

  function toggleCamera() {
    const next = !cameraOff;
    setCameraOff(next);
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
  }

  async function endCall() {
    const supabase = createClient();
    const channel = supabase.channel(`call:${callId}`);
    await channel.send({ type: "broadcast", event: "hangup", payload: {} });
    await fetch(`/api/v1/calls/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ended" })
    });
    router.push(`/${otherUser.username}`);
  }

  return (
    <div className="relative flex h-[100dvh] w-full flex-col bg-slate-950 text-white">
      <div className="relative flex-1 overflow-hidden">
        {status === "connected" ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Avatar src={otherUser.avatar_url} name={otherUser.display_name || otherUser.username} size={96} />
            <p className="text-lg font-semibold">{otherUser.display_name || otherUser.username}</p>
            <p className="text-sm text-slate-400">
              {status === "ended" ? "Call ended" : status === "ringing" ? "Ringing…" : "Connecting…"}
            </p>
          </div>
        )}

        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-4 right-4 h-32 w-24 rounded-xl object-cover shadow-lg md:h-44 md:w-32"
        />
      </div>

      <div className="flex items-center justify-center gap-4 p-6">
        <button
          onClick={toggleMute}
          className={`rounded-full p-4 ${muted ? "bg-white text-slate-950" : "bg-white/20"}`}
        >
          {muted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button
          onClick={toggleCamera}
          className={`rounded-full p-4 ${cameraOff ? "bg-white text-slate-950" : "bg-white/20"}`}
        >
          {cameraOff ? <VideoOff size={22} /> : <Video size={22} />}
        </button>
        <button onClick={endCall} className="rounded-full bg-red-600 p-4 hover:bg-red-700">
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
