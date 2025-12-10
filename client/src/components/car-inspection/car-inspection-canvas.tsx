import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";

type MarkerType = "P" | "T" | "C" | "D" | "WDC" | "WC" | "SM";

interface Marker {
  id: string;
  type: MarkerType;
  x: number;
  y: number;
}

interface Menu {
  x: number;
  y: number;
  visible: boolean;
  clickX: number;
  clickY: number;
}

// Methods exposed to parent via ref
export type ImageMarkerHandle = {
  getImageBlob: (type?: string, quality?: number) => Promise<Blob | null>;
  getDataUrl: (type?: string, quality?: number) => string | null;
};

const ImageMarker = forwardRef<ImageMarkerHandle | null, {}>((_props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedMarker, setDraggedMarker] = useState<string | null>(null);

  const canvasWidth = 1000;
  const canvasHeight = 600;

  const MARKER_RADIUS = 14;
  const MARKER_FONT_SIZE = Math.max(8, Math.floor(MARKER_RADIUS * 0.8));

  const MENU_WIDTH = 160;
  const MENU_ITEM_HEIGHT = 26;
  const MENU_PADDING = 10;

  // ALL menu items
  const MENU_ITEMS = ["P", "T", "C", "D", "WDC", "WC", "SM"];

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/car-inspection.png";
    img.onload = () => {
      setImage(img);
      drawCanvas();
    };
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [markers, image, selectedId, menu]);

  // Expose methods to parent
  useImperativeHandle(
    ref,
    () => ({
      getImageBlob: (type = "image/png", quality?: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return Promise.resolve(null);
        return new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), type, quality);
        });
      },
      getDataUrl: (type = "image/png", quality?: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        try {
          return canvas.toDataURL(type, quality);
        } catch {
          return null;
        }
      },
    }),
    []
  );

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (image) {
      ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
    }

    // ░░ MARKERS ░░
    markers.forEach((marker) => {
      const isSelected = marker.id === selectedId;

      let fillColor = "#FF0000";
      let label = marker.type.toUpperCase();

      switch (marker.type) {
        case "P":
          fillColor = "#FF4D4D";
          break;
        case "T":
          fillColor = "#FFD24D";
          break;
        case "C":
          fillColor = "#A0A0A0";
          break;
        case "D":
          fillColor = "#4D79FF";
          break;
        case "WDC":
          fillColor = "#00C2FF";
          break; // light blue
        case "WC":
          fillColor = "#FF7F27";
          break; // orange
        case "SM":
          fillColor = "#7D3C98";
          break; // purple
      }

      ctx.save();
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = isSelected ? "#FFD700" : "#000000";
      ctx.lineWidth = isSelected ? 3 : 2;

      ctx.beginPath();
      ctx.arc(marker.x, marker.y, MARKER_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${MARKER_FONT_SIZE}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, marker.x, marker.y);

      ctx.restore();
    });

    // ░░ MENU ░░
    if (menu && menu.visible) {
      ctx.save();

      const menuHeight = MENU_ITEMS.length * MENU_ITEM_HEIGHT + MENU_PADDING * 2;

      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 8;

      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#CCCCCC";
      ctx.lineWidth = 1;
      ctx.beginPath();
      roundRect(ctx, menu.x, menu.y, MENU_WIDTH, menuHeight, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();

      ctx.fillStyle = "#333";
      ctx.font = "13px Arial";
      ctx.textBaseline = "top";

      MENU_ITEMS.forEach((item, index) => {
        ctx.fillText(item, menu.x + 12, menu.y + MENU_PADDING + index * MENU_ITEM_HEIGHT + 6);
      });

      ctx.restore();
    }
  };

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const isInsideMarker = (x: number, y: number, marker: Marker) =>
    Math.sqrt((x - marker.x) ** 2 + (y - marker.y) ** 2) <= MARKER_RADIUS;

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);

    // MENU OPEN? → CLICK INSIDE?
    if (menu && menu.visible) {
      const menuHeight = MENU_ITEMS.length * MENU_ITEM_HEIGHT + MENU_PADDING * 2;

      if (x >= menu.x && x <= menu.x + MENU_WIDTH && y >= menu.y && y <= menu.y + menuHeight) {
        const relativeY = y - (menu.y + MENU_PADDING);
        const index = Math.floor(relativeY / MENU_ITEM_HEIGHT);

        if (index >= 0 && index < MENU_ITEMS.length) {
          const chosen = MENU_ITEMS[index].toLowerCase() as MarkerType;
          placeMarker(chosen, menu.clickX, menu.clickY);
        }

        return;
      }

      setMenu(null);
      return;
    }

    // CLICKED A MARKER?
    const clickedMarker = markers.find((m) => isInsideMarker(x, y, m));
    if (clickedMarker) {
      setSelectedId(clickedMarker.id);
      return;
    }

    // OPEN MENU
    const menuHeight = MENU_ITEMS.length * MENU_ITEM_HEIGHT + MENU_PADDING * 2;

    const clampedX = Math.min(Math.max(8, x), canvasWidth - MENU_WIDTH - 8);
    const clampedY = Math.min(Math.max(8, y), canvasHeight - menuHeight - 8);

    setMenu({ x: clampedX, y: clampedY, visible: true, clickX: x, clickY: y });
    setSelectedId(null);
  };

  const placeMarker = (type: MarkerType, x: number, y: number) => {
    const newMarker: Marker = { id: `${type}-${Date.now()}`, type, x, y };
    setMarkers((prev) => [...prev, newMarker]);
    setSelectedId(newMarker.id);
    setMenu(null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (menu?.visible) return;

    const { x, y } = getCanvasCoordinates(e);
    const marker = markers.find((m) => isInsideMarker(x, y, m));

    if (marker) {
      setDraggedMarker(marker.id);
      setSelectedId(marker.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedMarker) return;

    const { x, y } = getCanvasCoordinates(e);
    setMarkers((prev) => (prev.map((m) => (m.id === draggedMarker ? { ...m, x, y } : m))));
  };

  const handleMouseUp = () => setDraggedMarker(null);

  const removeSelected = () => {
    if (!selectedId) return;
    setMarkers((prev) => prev.filter((m) => m.id !== selectedId));
    setSelectedId(null);
  };

  const exportImage = () => {
    const url = canvasRef.current!.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "annotated-image.png";
    a.click();
  };

  return (
    <div className="p-4 space-y-4 font-sans">
      <div className="flex items-center gap-2">
        <button onClick={removeSelected} className="px-3 py-1 rounded border bg-white" disabled={!selectedId}>
          Delete
        </button>
        <button onClick={exportImage} className="px-3 py-1 rounded border bg-white">Export PNG</button>
        <span className="ml-2 text-sm">Click anywhere to add a marker.</span>
      </div>

      <div className="border">
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="cursor-crosshair"
        />
      </div>
    </div>
  );
});

export default ImageMarker;
