"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Area } from "react-easy-crop";
import Cropper from "react-easy-crop";
import {
  createTestimonialSchema,
  messageKeyForIssue,
} from "@/lib/schemas/testimonial";
import {
  BUCKETS,
  contentTypeFor,
  extensionOf,
  objectPath,
} from "@/lib/storage";
import { createBrowserStorage } from "@/lib/storage/supabase-storage";

type FormState = "idle" | "submitting" | "success" | "error";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  // Solo devuelve null si el canvas ya tiene otro contexto asignado; acá el
  // elemento se acaba de crear, así que en la práctica nunca ocurre.
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas.");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        // `toBlob` entrega null si la codificación falla. Antes se asumía que
        // nunca pasaba y `new File([null])` habría generado un archivo corrupto.
        if (!blob) {
          reject(new Error("No se pudo codificar la imagen recortada."));
          return;
        }
        resolve(new File([blob], "photo.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    ),
  );
}

export default function NewTestimonialPage() {
  const t = useTranslations("testimonialForm");
  const router = useRouter();

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [email, setEmail] = useState("");

  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg(t("photo_too_large"));
      return;
    }
    const url = URL.createObjectURL(file);
    setRawImageUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowCrop(true);
    setErrorMsg("");
    // reset so the same file can be re-selected
    e.target.value = "";
  }

  async function confirmCrop() {
    if (!rawImageUrl || !croppedAreaPixels) return;
    const file = await getCroppedImg(rawImageUrl, croppedAreaPixels);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setShowCrop(false);
  }

  function cancelCrop() {
    setRawImageUrl(null);
    setShowCrop(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    // Las reglas son las del esquema compartido: acá no se reescriben, solo se
    // traduce el problema que reporta. La imagen se valida después porque
    // todavía no está subida y no hay URL que mostrarle al esquema.
    const check = createTestimonialSchema.safeParse({
      name,
      message,
      linkedin_url: linkedin || null,
      github_username: github || null,
      email: email || null,
    });

    if (!check.success) {
      const [issue] = check.error.issues;
      const key = messageKeyForIssue(issue);
      setErrorMsg(key ? t(key) : t("error"));
      return;
    }

    setFormState("submitting");

    let image_url: string | null = null;
    if (imageFile) {
      // El recorte siempre entrega un JPEG, pero derivarlo del archivo evita
      // que cambiar `getCroppedImg` deje la extensión mintiendo en silencio.
      const extension = extensionOf(imageFile.name) ?? "jpg";
      const contentType = contentTypeFor(extension);

      if (!contentType) {
        setErrorMsg(t("error"));
        setFormState("error");
        return;
      }

      try {
        const { url } = await createBrowserStorage().upload({
          bucket: BUCKETS.testimonialImages,
          path: objectPath(extension),
          body: imageFile,
          contentType,
        });
        image_url = url;
      } catch {
        setErrorMsg(t("error"));
        setFormState("error");
        return;
      }
    }

    const res = await fetch("/api/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        message,
        image_url,
        linkedin_url: linkedin || null,
        github_username: github || null,
        email: email || null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setErrorMsg(data.error || t("error"));
      setFormState("error");
      return;
    }

    setFormState("success");
  }

  useEffect(() => {
    if (formState !== "success") return;
    const timer = setTimeout(() => router.push("/"), 3000);
    return () => clearTimeout(timer);
  }, [formState, router]);

  if (formState === "success") {
    return (
      <main className="h-[100dvh] flex items-center justify-center px-4 overflow-hidden">
        <div className="max-w-md w-full rounded-2xl border border-brand/30 bg-brand-muted p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-brand/15 border border-brand/25 flex items-center justify-center mx-auto mb-4">
            <svg
              aria-hidden="true"
              className="w-6 h-6 text-brand"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h1 className="text-base font-bold text-foreground mb-2">
            {t("success_title")}
          </h1>
          <p className="text-sm text-foreground/70">{t("success_message")}</p>
          <p className="text-xs text-muted-foreground mt-4">
            {t("success_redirect")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* Crop modal - full screen on mobile */}
      {showCrop && rawImageUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="relative flex-1">
            <Cropper
              image={rawImageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="px-5 pt-4 pb-8 space-y-4 bg-zinc-950 border-t border-white/8">
            <p className="text-xs text-center text-white/50">
              {t("crop_hint")}
            </p>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-brand h-1"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelCrop}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-semibold text-white/70 hover:bg-white/5 transition-colors"
              >
                {t("crop_cancel")}
              </button>
              <button
                type="button"
                onClick={confirmCrop}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                {t("crop_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="py-8 px-4 overflow-x-hidden">
        <div className="max-w-lg mx-auto">
          <div className="mb-8">
            <h1 className="text-base font-bold text-foreground mb-2">
              {t("title")}
            </h1>
            <p className="text-sm text-foreground/65">{t("subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label
                htmlFor="testimonial-name"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                {t("name_label")} <span className="text-brand">*</span>
              </label>
              <input
                id="testimonial-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("name_placeholder")}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/60 transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label
                htmlFor="testimonial-message"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                {t("message_label")} <span className="text-brand">*</span>
              </label>
              <textarea
                id="testimonial-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("message_placeholder")}
                rows={4}
                className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/60 transition-colors resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {message.length} / 20 {t("chars_min")}
              </p>
            </div>

            {/* Photo */}
            <div>
              {/* No es un <label>: rotula el grupo completo (preview + botones),
                  no un control puntual. El input file va oculto y se dispara
                  por ref, así que no hay nada a lo que apuntar con htmlFor. */}
              <span
                id="testimonial-photo-label"
                className="block text-xs font-semibold text-foreground mb-1.5"
              >
                {t("photo_label")}
              </span>
              <p className="text-xs text-muted-foreground mb-2">
                {t("photo_hint")}
              </p>
              <fieldset
                aria-labelledby="testimonial-photo-label"
                className="flex items-center gap-3"
              >
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="preview"
                    width={48}
                    height={48}
                    className="rounded-full w-12 h-12 object-cover border border-border shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full border border-dashed border-border/60 flex items-center justify-center shrink-0">
                    <svg
                      aria-hidden="true"
                      className="w-5 h-5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-foreground hover:border-brand/40 hover:bg-brand-muted transition-all duration-150"
                  >
                    {imagePreview ? t("photo_change") : t("photo_button")}
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-all duration-150"
                    >
                      {t("photo_remove")}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </fieldset>
            </div>

            {/* Social */}
            <div>
              {/* Rotula los tres campos de contacto como grupo, no uno solo. */}
              <span
                id="testimonial-social-label"
                className="block text-xs font-semibold text-foreground mb-1"
              >
                {t("social_label")} <span className="text-brand">*</span>
              </span>
              <p className="text-xs text-muted-foreground mb-2.5">
                {t("social_hint")}
              </p>
              <fieldset
                aria-labelledby="testimonial-social-label"
                className="space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">
                    LinkedIn
                  </span>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder={t("linkedin_placeholder")}
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/60 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">
                    GitHub
                  </span>
                  <input
                    type="text"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder={t("github_placeholder")}
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/60 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">
                    Email
                  </span>
                  <input
                    type="text"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("email_placeholder")}
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand/60 transition-colors"
                  />
                </div>
              </fieldset>
            </div>

            {errorMsg && (
              <p className="text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={formState === "submitting"}
              className="w-full rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.97] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {formState === "submitting" ? t("submitting") : t("submit")}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
