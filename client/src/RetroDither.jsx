import React, { useEffect, useRef, useState } from 'react';

export default function RetroDither({ src, pixelSize = 2, brightness = 1.0, contrast = 1.0, className = "", alt = "" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      if (!active) return;
      setLoading(false);

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Determine the target resolution based on the container width and pixelSize
      const containerWidth = containerRef.current?.clientWidth || 400;
      // We want to downscale the image to create the pixelated effect
      const targetWidth = Math.max(128, Math.floor(containerWidth / pixelSize));
      const aspectRatio = img.height / img.width;
      const targetHeight = Math.floor(targetWidth * aspectRatio);

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw image to canvas with downscaling
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      try {
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;

        // Bayer 4x4 matrix for ordered dithering
        const bayer4x4 = [
          [0,  8,  2,  10],
          [12, 4,  14, 6],
          [3,  11, 1,  9],
          [15, 7,  13, 5]
        ];

        // Apply contrast and brightness adjustments, then apply dithering
        for (let y = 0; y < targetHeight; y++) {
          for (let x = 0; x < targetWidth; x++) {
            const idx = (y * targetWidth + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // 1. Convert to grayscale (luma)
            let luma = 0.299 * r + 0.587 * g + 0.114 * b;

            // 2. Apply Brightness & Contrast
            luma = (luma - 128) * contrast + 128 + (brightness - 1) * 255;
            luma = Math.max(0, Math.min(255, luma));

            // 3. Get threshold from Bayer matrix
            const matrixVal = bayer4x4[y % 4][x % 4];
            // Normalize to 0-255 scale
            const threshold = (matrixVal + 0.5) * 16;

            // 4. Quantize to 4 shades of retro gray (Macintosh style)
            // Shades: 10 (black), 80 (dark gray), 180 (light gray), 245 (white)
            let finalColor;
            const normalizedLuma = luma / 255;
            
            // Scaled matrix threshold (0 to 1)
            const mThreshold = threshold / 256;

            // Map luma to 3 intervals for 4 colors
            const valueWithDither = normalizedLuma * 3 + (mThreshold - 0.5) * 0.8;
            const quantizedValue = Math.round(Math.max(0, Math.min(3, valueWithDither)));
            
            if (quantizedValue === 0) finalColor = 10;       // Near black
            else if (quantizedValue === 1) finalColor = 80;  // Dark grey
            else if (quantizedValue === 2) finalColor = 180; // Light grey
            else finalColor = 245;                           // Off-white

            data[idx] = finalColor;
            data[idx + 1] = finalColor;
            data[idx + 2] = finalColor;
          }
        }

        ctx.putImageData(imgData, 0, 0);
      } catch (err) {
        console.error("Canvas manipulation failed (likely CORS or context error):", err);
      }
    };

    return () => {
      active = false;
    };
  }, [src, pixelSize, brightness, contrast]);

  return (
    <div 
      ref={containerRef} 
      className={`retro-dither-container ${className}`} 
      style={{ 
        width: '100%', 
        position: 'relative',
        background: '#000',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {loading && (
        <div className="retro-dither-loader" style={{ position: 'absolute', color: '#fff', fontSize: '10px', fontFamily: 'monospace' }}>
          LOADING MATRIX...
        </div>
      )}
      <canvas 
        ref={canvasRef}
        alt={alt}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          imageRendering: 'pixelated'
        }}
      />
    </div>
  );
}
