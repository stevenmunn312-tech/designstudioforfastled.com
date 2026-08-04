import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const leds: [string, string][] = [
  ["#00ffff", "#ff00ff"], ["#ff00ff", "#ff00ff"], ["#ff00ff", "#ff00ff"], ["#00ffff", "#ff00ff"],
  ["#ff00ff", "#ff00ff"], ["#a8ff00", "#a8ff00"], ["#00bfff", "#00bfff"], ["#ff00ff", "#ff00ff"],
  ["#ff00ff", "#ff00ff"], ["#00bfff", "#00bfff"], ["#a8ff00", "#a8ff00"], ["#ff00ff", "#ff00ff"],
  ["#00ffff", "#ff00ff"], ["#ff00ff", "#ff00ff"], ["#ff00ff", "#ff00ff"], ["#00ffff", "#ff00ff"],
];

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d0f12",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", width: 45, gap: 3 }}>
        {leds.map(([glow, core], index) => (
          <div
            key={index}
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: core,
              boxShadow: `0 0 5px 2px ${glow}88`,
            }}
          />
        ))}
      </div>
    </div>,
    size,
  );
}
