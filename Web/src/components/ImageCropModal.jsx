import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';

function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });
}

function rotateSize(width, height, rotation) {
  const rad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

async function getCroppedBlob(imageSrc, pixelCrop, rotation) {
  const image = await createImage(imageSrc);
  const rotRad = (rotation * Math.PI) / 180;
  const { width: bw, height: bh } = rotateSize(image.width, image.height, rotation);

  const canvas = document.createElement('canvas');
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext('2d');
  ctx.translate(bw / 2, bh / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const out = document.createElement('canvas');
  out.width = pixelCrop.width;
  out.height = pixelCrop.height;
  out.getContext('2d').drawImage(
    canvas,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );

  return new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', 0.92));
}

export default function ImageCropModal({ imageSrc, onDone, onCancel, uploading }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, pixels) => setCroppedAreaPixels(pixels), []);

  const rotate = (deg) => setRotation((r) => Math.max(-180, Math.min(180, r + deg)));

  const handleSave = async () => {
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation);
    onDone(blob);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <div className="flex items-center justify-center px-4 py-3 bg-black/80 relative">
        <button onClick={onCancel} className="absolute left-4 text-gray-400 text-sm">
          ✕
        </button>
        <p className="text-white text-sm font-medium">Edit Photo</p>
      </div>

      {/* Crop area */}
      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#000' },
            cropAreaStyle: { border: '2px solid rgba(255,255,255,0.7)' },
          }}
        />
      </div>

      {/* Controls */}
      <div className="bg-gray-950 px-5 pt-4 pb-8 flex flex-col gap-4">
        {/* Zoom */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs w-12">Zoom</span>
          <span className="text-gray-500 text-base">🔍</span>
          <input
            type="range" min={1} max={3} step={0.02} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-1 accent-primary-500 cursor-pointer"
          />
          <span className="text-gray-400 text-xs w-8 text-right">{zoom.toFixed(1)}×</span>
        </div>

        {/* Rotation */}
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs w-12">Rotate</span>
          <span className="text-gray-500 text-base">↻</span>
          <input
            type="range" min={-180} max={180} step={1} value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="flex-1 h-1 accent-primary-500 cursor-pointer"
          />
          <span className="text-gray-400 text-xs w-8 text-right">{rotation}°</span>
        </div>

        {/* Quick rotate buttons */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => rotate(-90)}
            className="flex-1 py-2 rounded-xl bg-gray-800 text-white text-sm flex items-center justify-center gap-1.5"
          >
            ↺ <span>-90°</span>
          </button>
          <button
            onClick={() => { setRotation(0); setZoom(1); setCrop({ x: 0, y: 0 }); }}
            className="px-4 py-2 rounded-xl bg-gray-800 text-gray-400 text-xs"
          >
            Reset
          </button>
          <button
            onClick={() => rotate(90)}
            className="flex-1 py-2 rounded-xl bg-gray-800 text-white text-sm flex items-center justify-center gap-1.5"
          >
            <span>+90°</span> ↻
          </button>
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-gray-700 text-gray-300 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={uploading}
            className="flex-1 py-3 rounded-2xl bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {uploading ? 'Saving…' : 'Save Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
