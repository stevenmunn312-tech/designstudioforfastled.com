import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#080b10",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", width: 36, gap: 4 }}>
        {["#26303d", "#61e4ff", "#61e4ff", "#876bff", "#61e4ff", "#26303d", "#876bff", "#61e4ff", "#26303d"].map((color, index) => (
          <div key={index} style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
        ))}
      </div>
    </div>,
    size,
  );
}
