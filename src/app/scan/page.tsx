"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { Camera, X } from "lucide-react";
import TopBar from "@/components/TopBar";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "denied" | "found">("idle");
  const [error, setError] = useState("");

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("denied");
      setError("이 브라우저에서는 카메라를 사용할 수 없어요. 카카오톡 등 인앱 브라우저라면 '다른 브라우저로 열기'를 사용해보세요.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("scanning");
      tick();
    } catch (e) {
      setStatus("denied");
      setError("카메라 접근이 거부되었거나 사용할 수 없어요. 브라우저의 카메라 권한을 확인해주세요.");
    }
  };

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data) {
      setStatus("found");
      stopCamera();
      handleResult(code.data);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleResult = (data: string) => {
    try {
      const url = new URL(data);
      // 같은 사이트의 /checkin/[token] 링크면 바로 이동, 아니면 원문 그대로 새 창 시도하지 않고 안내
      const match = url.pathname.match(/\/checkin\/(.+)$/);
      if (match) {
        router.push(`/checkin/${match[1]}`);
        return;
      }
    } catch {
      // data가 URL이 아니라 토큰 문자열 자체일 수도 있음
    }
    router.push(`/checkin/${encodeURIComponent(data)}`);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="min-h-screen bg-navy">
      <TopBar title="QR 체크인 스캔" backHref="/" />
      <div className="p-4 flex flex-col items-center">
        {status === "idle" && (
          <div className="flex flex-col items-center pt-16 text-center">
            <Camera size={40} className="text-white mb-4" />
            <p className="text-white text-sm mb-1">현장에 게시된 QR 코드를 스캔해주세요.</p>
            <p className="text-white/60 text-xs mb-6">카메라 권한을 허용해야 스캔할 수 있어요.</p>
            <button onClick={startCamera} className="px-6 py-3 rounded-xl font-display bg-coral text-white">
              카메라 켜기
            </button>
          </div>
        )}

        <div className={`w-full max-w-sm relative rounded-2xl overflow-hidden border-2 border-white/30 mb-2 ${status === "scanning" || status === "found" ? "" : "hidden"}`}>
          <video ref={videoRef} className="w-full h-auto" muted playsInline autoPlay />
          <div className="absolute inset-8 border-2 border-coral rounded-xl pointer-events-none" />
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {status === "scanning" && <p className="text-white/70 text-xs mt-4">QR 코드를 화면 중앙에 맞춰주세요...</p>}

        {status === "denied" && (
          <div className="flex flex-col items-center pt-16 text-center">
            <X size={40} className="text-coral mb-4" />
            <p className="text-white text-sm mb-4">{error}</p>
            <button onClick={startCamera} className="px-6 py-3 rounded-xl font-display bg-coral text-white">다시 시도</button>
          </div>
        )}
      </div>
    </div>
  );
}
