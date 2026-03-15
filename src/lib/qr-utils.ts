export type GeneratorMode = "text" | "link" | "video";

export type HistoryEntry = {
  id: string;
  action: "scanned" | "created";
  rawValue: string;
  title?: string;
  createdAt: string;
};

export type PayloadDescriptor = {
  kind: "text" | "url" | "video" | "email" | "phone";
  label: string;
  rawValue: string;
  url?: string;
  videoUrl?: string;
  videoEmbed?: string;
};

function isYoutubeUrl(url: URL) {
  return ["youtube.com", "www.youtube.com", "youtu.be", "m.youtube.com"].includes(url.hostname);
}

function toYoutubeEmbed(url: URL) {
  let videoId = "";

  if (url.hostname === "youtu.be") {
    videoId = url.pathname.replace("/", "");
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v") || "";
  } else if (url.pathname.startsWith("/shorts/")) {
    videoId = url.pathname.split("/")[2] || "";
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : undefined;
}

function isPrivateHostname(hostname: string) {
  const lower = hostname.toLowerCase();

  if (["localhost", "0.0.0.0", "::1"].includes(lower) || lower.endsWith(".local")) {
    return true;
  }

  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(lower);
  if (!ipv4) {
    return false;
  }

  const [a, b] = lower.split(".").map(Number);
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export function isLikelyVideoUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      /\.(mp4|webm|ogg|mov|m4v)$/i.test(url.pathname) ||
      isYoutubeUrl(url) ||
      ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export function assessUrlSafety(value: string) {
  try {
    const url = new URL(value);
    const protocol = url.protocol.toLowerCase();

    if (!["https:"].includes(protocol)) {
      return {
        safe: false,
        reason: "Only HTTPS links are considered safe enough to open in this frontend-only version.",
      };
    }

    if (isPrivateHostname(url.hostname)) {
      return {
        safe: false,
        reason: "Private, localhost and LAN addresses are blocked to avoid opening internal resources from QR codes.",
      };
    }

    if (url.hostname.includes("xn--")) {
      return {
        safe: false,
        reason: "Punycode domains are blocked here because they can be used for lookalike phishing.",
      };
    }

    return {
      safe: true,
      reason: "HTTPS scheme passed and the hostname does not look local, private or obviously suspicious.",
    };
  } catch {
    return {
      safe: false,
      reason: "The payload does not parse as a valid URL.",
    };
  }
}

export function describePayload(rawValue: string): PayloadDescriptor {
  const value = rawValue.trim();

  if (/^mailto:/i.test(value)) {
    return { kind: "email", label: "Email", rawValue: value };
  }

  if (/^tel:/i.test(value)) {
    return { kind: "phone", label: "Phone", rawValue: value };
  }

  try {
    const url = new URL(value);
    const youtubeEmbed = isYoutubeUrl(url) ? toYoutubeEmbed(url) : undefined;

    if (isLikelyVideoUrl(value)) {
      return {
        kind: "video",
        label: "Video",
        rawValue: value,
        url: value,
        videoUrl: youtubeEmbed ? undefined : value,
        videoEmbed: youtubeEmbed,
      };
    }

    return {
      kind: "url",
      label: "Link",
      rawValue: value,
      url: value,
    };
  } catch {
    return {
      kind: "text",
      label: "Text",
      rawValue: value,
    };
  }
}

export function buildGeneratorValue(mode: GeneratorMode, input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  if (mode === "text") {
    return input;
  }

  return trimmed;
}
