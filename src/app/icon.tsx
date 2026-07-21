import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const logoBase64 = readFileSync(join(process.cwd(), "public/images/logo.png")).toString("base64");

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          overflow: "hidden",
          backgroundColor: "#e3e8c8",
        }}
      >
        {/* Cropped to the palm-tree crowns only — the full mark (trunks + "S | J")
            turns into an illegible smudge at 32px, so this shows just the
            most recognizable top portion, scaled and top-aligned to crop the rest. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${logoBase64}`}
          alt=""
          height={72}
          style={{ marginTop: -6 }}
        />
      </div>
    ),
    { ...size }
  );
}
