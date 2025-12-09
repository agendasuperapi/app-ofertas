import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onCropComplete: (croppedBlob: Blob) => void;
}

export function AvatarCropDialog({ open, onOpenChange, imageUrl, onCropComplete }: AvatarCropDialogProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleCrop = async () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputSize = 256;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const container = containerRef.current.getBoundingClientRect();
    const cropSize = Math.min(container.width, container.height);

    const img = imageRef.current;
    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;

    // Calculate the visible dimensions of the image in the container
    const imgDisplayWidth = img.width * scale;
    const imgDisplayHeight = img.height * scale;

    // Calculate the center of the crop area
    const cropCenterX = cropSize / 2;
    const cropCenterY = cropSize / 2;

    // Calculate the position of the image center relative to the crop center
    const imgCenterX = cropCenterX + position.x + imgDisplayWidth / 2 - cropSize / 2;
    const imgCenterY = cropCenterY + position.y + imgDisplayHeight / 2 - cropSize / 2;

    // Calculate source coordinates
    const scaleRatioX = imgNaturalWidth / imgDisplayWidth;
    const scaleRatioY = imgNaturalHeight / imgDisplayHeight;

    const sourceX = (cropCenterX - imgCenterX) * scaleRatioX + imgNaturalWidth / 2 - (cropSize / 2) * scaleRatioX;
    const sourceY = (cropCenterY - imgCenterY) * scaleRatioY + imgNaturalHeight / 2 - (cropSize / 2) * scaleRatioY;
    const sourceSize = cropSize * scaleRatioX;

    // Draw circular clip
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw the image
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
        onOpenChange(false);
        handleReset();
      }
    }, "image/jpeg", 0.9);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar Foto</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            ref={containerRef}
            className="relative w-64 h-64 rounded-full overflow-hidden border-2 border-primary/30 cursor-move bg-muted"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Preview"
              className="absolute select-none pointer-events-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: "center",
                left: "50%",
                top: "50%",
                marginLeft: "-50%",
                marginTop: "-50%",
                maxWidth: "none",
                width: "100%",
                height: "auto"
              }}
              draggable={false}
            />
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Arraste a imagem para posicionar
          </p>

          <div className="flex items-center gap-3 w-full max-w-xs">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[scale]}
              onValueChange={(value) => setScale(value[0])}
              min={0.5}
              max={3}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>

          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCrop}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
