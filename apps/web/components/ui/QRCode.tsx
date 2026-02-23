'use client';

export function QRCode({ value, size = 128 }: { value: string; size?: number }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodeURIComponent(value)}`;

  return (
    <img
      src={qrUrl}
      alt="QR Code"
      width={size}
      height={size}
      className="rounded"
      loading="lazy"
    />
  );
}
