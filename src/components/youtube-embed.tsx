"use client"

import { useState } from "react"
import Image from "next/image"

interface YouTubeEmbedProps {
    videoId: string
    title?: string
}

export function YouTubeEmbed({ videoId, title = "YouTube video" }: YouTubeEmbedProps) {
    const [isLoaded, setIsLoaded] = useState(false)

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

    if (!isLoaded) {
        return (
            <button
                type="button"
                onClick={() => setIsLoaded(true)}
                className="relative w-full aspect-video bg-muted overflow-hidden group cursor-pointer rounded-lg"
                aria-label={`Play ${title}`}
            >
                <Image
                    src={thumbnailUrl}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    sizes="(max-width: 768px) 100vw, 576px"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-brand shadow-lg shadow-brand/30 transition-transform duration-200 group-hover:scale-110">
                        <svg
                            className="w-5 h-5 text-white ml-0.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            </button>
        )
    }

    return (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden">
            <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
            />
        </div>
    )
}
