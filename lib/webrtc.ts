export function getIceServers(): RTCIceServer[] {
  const raw = process.env.NEXT_PUBLIC_ICE_SERVERS || "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302";
  return raw
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ urls: url }));
}
