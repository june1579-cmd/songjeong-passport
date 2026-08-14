"use client";
import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// 저작권이 있는 음원 파일을 쓰지 않고, Web Audio API로 파도 소리를 직접 합성한다.
// (필터링된 화이트노이즈 + 느린 볼륨 변조로 파도가 밀려왔다 빠지는 느낌을 낸다)
export default function AmbientWaveSound() {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ source?: AudioBufferSourceNode; gain?: GainNode; lfo?: OscillatorNode } | null>(null);

  const start = () => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    ctxRef.current = ctx;

    // 화이트노이즈 버퍼 생성 (2초 루프)
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 700;

    const gain = ctx.createGain();
    gain.gain.value = 0.05;

    // LFO로 파도가 밀려왔다 빠지는 느낌의 볼륨 변조
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.045;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    lfo.start();
    nodesRef.current = { source, gain, lfo };
    setPlaying(true);
  };

  const stop = () => {
    nodesRef.current?.source?.stop();
    nodesRef.current?.lfo?.stop();
    ctxRef.current?.close();
    nodesRef.current = null;
    setPlaying(false);
  };

  return (
    <button
      onClick={() => (playing ? stop() : start())}
      className="fixed bottom-20 right-4 z-40 w-11 h-11 rounded-full bg-navy text-white flex items-center justify-center shadow-lg"
      aria-label={playing ? "배경음악 끄기" : "배경음악 켜기 (파도 소리)"}
    >
      {playing ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
