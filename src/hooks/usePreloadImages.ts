import { useEffect, useState } from "react";

const INTERVIEWER_IMAGES = ["/interviewers/lisa.jpg", "/interviewers/bob.jpg"];

export function usePreloadImages() {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    // Add preload link tags to document head
    const preloadLinks: HTMLLinkElement[] = [];

    INTERVIEWER_IMAGES.forEach((src) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = src;
      document.head.appendChild(link);
      preloadLinks.push(link);
    });

    // Also preload via Image objects for double coverage
    const preloadImages = async () => {
      const imagePromises = INTERVIEWER_IMAGES.map((src) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = reject;
          img.src = src;
        });
      });

      try {
        await Promise.all(imagePromises);
        setImagesLoaded(true);
      } catch (error) {
        console.error("Failed to preload images:", error);
        setImagesLoaded(true);
      }
    };

    preloadImages();

    // Cleanup function to remove preload links
    return () => {
      preloadLinks.forEach((link) => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      });
    };
  }, []);

  return imagesLoaded;
}
