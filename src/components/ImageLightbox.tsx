import { useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";

/** Miniatura que al tocarla abre la imagen completa en pantalla (se cierra con clic o Esc). */
export default function ImageLightbox({ src, alt = "Imagen", className = "" }: { src: string; alt?: string; className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Ampliar ${alt}`}
        className="relative block w-full group cursor-zoom-in">
        <img src={src} alt={alt} className={className} />
        <span className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 text-white rounded-xl flex items-center justify-center opacity-90 group-hover:bg-black/70 transition-colors">
          <ZoomIn size={14} />
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setOpen(false)} role="dialog" aria-modal="true">
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-2xl flex items-center justify-center">
            <X size={18} />
          </button>
          <img src={src} alt={alt} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
