"use client";

import { useEffect, useRef } from "react";

export default function BackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = 1.2;

    const setSpeed = () => {
      video.playbackRate = 1.2;
    };

    video.addEventListener("loadedmetadata", setSpeed);
    video.play().catch(() => {});

    return () => {
      video.removeEventListener("loadedmetadata", setSpeed);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className="hero-video"
    >
      <source src="/videos/bookmypg-background.mp4" type="video/mp4" />
    </video>
  );
}
