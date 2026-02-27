import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const size = parseInt(request.nextUrl.searchParams.get("size") || "512");
  const clampedSize = Math.min(Math.max(size, 16), 1024);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)",
          borderRadius: clampedSize * 0.2,
        }}
      >
        {/* Checkmark icon */}
        <svg
          width={clampedSize * 0.55}
          height={clampedSize * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Clipboard body */}
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          {/* Clipboard tab */}
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          {/* Checkmark */}
          <path d="M9 14l2 2 4-4" />
        </svg>
      </div>
    ),
    {
      width: clampedSize,
      height: clampedSize,
    }
  );
}
