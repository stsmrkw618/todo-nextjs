import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TODO Dashboard",
    short_name: "TODO",
    description: "タスク管理ダッシュボード",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#8b5cf6",
    icons: [
      {
        src: "/api/icon?size=192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/api/icon?size=512",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
