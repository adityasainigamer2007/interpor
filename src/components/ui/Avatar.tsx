interface AvatarProps {
  name: string;
  color?: string;
  size?: "sm" | "md" | "lg" | "xl";
  title?: string;
}

/** Initials avatar tinted with the user's assigned colour. */
export function Avatar({ name, color, size = "md", title }: AvatarProps) {
  const parts = name.trim().split(/\s+/);
  const text = ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
  const cls = size === "md" ? "avatar" : `avatar ${size}`;

  return (
    <span
      className={cls}
      title={title ?? name}
      aria-hidden={title ? undefined : true}
      style={
        color
          ? {
              background: `linear-gradient(145deg, ${color}, color-mix(in srgb, ${color} 45%, #0b0b0c))`,
              color: "#0b0b0c",
              borderColor: "transparent",
              fontWeight: 700,
            }
          : undefined
      }
    >
      {text || "?"}
    </span>
  );
}
