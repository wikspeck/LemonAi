import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { id: "/", name: "Lume Notebooks", short_name: "Lume", description: "A little room to think. Local-first notes, sources, and AI.", start_url: "/", scope: "/", display: "standalone", background_color: "#f9faf7", theme_color: "#304d3d", categories: ["productivity", "education"], icons: [{ src: "/lume-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/lume-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/lume-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] };
}
