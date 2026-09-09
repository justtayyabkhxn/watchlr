/**
 * Client-side renderer for the letterboxd-style "story card" — a 1080×1920
 * PNG built on canvas in the watchlr design language, sized for instagram
 * stories but happy anywhere. Runs only in the browser.
 */

export type ShareCardInput = {
  title: string;
  year: string;
  mediaType: "movie" | "tv";
  posterUrl: string | null;
  /** community average (tmdb), 0–10 */
  rating: number;
  /** the signed-in user's own rating, 1–10, if any */
  myRating?: number | null;
  /** public profile handle — puts "@user" + the profile link on the card */
  username?: string | null;
  /** minutes, movies only — shown in the stats sticker */
  runtime?: number | null;
  /** genre names for the stats sticker (first two are used) */
  genres?: string[];
  /** ai-written sarcastic one-liner, drawn under the date/time stamp */
  tagline?: string | null;
};

const W = 1080;
const H = 1920;

// palette tokens mirrored from app/globals.css — canvas can't read CSS vars
// from a detached context, so they live here too
const INK = "#1d1d1d";
const BACKGROUND = "#f6efe3";
const CARD = "#ffffff";
const MUTED = "#666666";
const ACCENT = "#f59e52";
const ACCENT_SOFT = "#ffdfa8";
const DOT = "rgb(213 184 133 / 0.5)";

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const inner = r * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : inner;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // tmdb serves images with CORS enabled
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("poster failed to load"));
    img.src = url;
  });
}

/** Break a title into at most `maxLines` lines that fit `maxWidth`; the last
 *  line gets an ellipsis if the title still overflows. */
function wrapTitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width <= maxWidth || !line) {
      line = attempt;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line) {
    const consumed = lines.join(" ").split(/\s+/).filter(Boolean).length;
    const rest = words.slice(consumed).join(" ");
    let last = rest || line;
    if (ctx.measureText(last).width > maxWidth) {
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1).trimEnd();
      }
      last = `${last}…`;
    }
    lines.push(last);
  }
  return lines;
}

export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  // next/font registers bricolage under a mangled family name — read the real
  // one off the body so canvas text matches the app
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  await document.fonts.ready;

  const title = input.title.toLowerCase();

  // ---- beige page + polka-dot grid --------------------------------------
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = DOT;
  const spacing = 52;
  for (let y = spacing / 2; y < H; y += spacing) {
    for (let x = spacing / 2; x < W; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- giant watermark wordmark behind the poster -----------------------
  ctx.save();
  ctx.translate(W / 2, 760);
  ctx.rotate((-6 * Math.PI) / 180);
  ctx.font = `900 300px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = ACCENT_SOFT;
  ctx.fillText("watchlr", 0, 0);
  ctx.restore();

  // ---- top overline + handle ---------------------------------------------
  const handle = input.username?.trim().toLowerCase() || null;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 34px ${family}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("found on watchlr", W / 2, 104);
  if (handle) {
    ctx.font = `900 38px ${family}`;
    ctx.fillStyle = INK;
    ctx.fillText(`shared by @${handle}`, W / 2, 158);
  }

  // ---- poster (rotated, white frame, soft shadow) ------------------------
  const pw = 640;
  const ph = 960;
  const px = (W - pw) / 2;
  const py = 220;
  const frame = 16;
  const radius = 40;

  ctx.save();
  ctx.translate(px + pw / 2, py + ph / 2);
  ctx.rotate((-2 * Math.PI) / 180);
  ctx.translate(-(pw / 2), -(ph / 2));

  // soft lift shadow — photographic content keeps soft shadows
  ctx.save();
  ctx.shadowColor = "rgb(29 29 29 / 0.28)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 26;
  ctx.fillStyle = CARD;
  roundRectPath(ctx, -frame, -frame, pw + frame * 2, ph + frame * 2, radius + frame);
  ctx.fill();
  ctx.restore();

  let poster: HTMLImageElement | null = null;
  if (input.posterUrl) {
    try {
      poster = await loadImage(input.posterUrl);
    } catch {
      poster = null; // fall through to the placeholder tile
    }
  }

  roundRectPath(ctx, 0, 0, pw, ph, radius);
  ctx.save();
  ctx.clip();
  if (poster) {
    // cover-fit the 2/3 frame
    const scale = Math.max(pw / poster.width, ph / poster.height);
    const dw = poster.width * scale;
    const dh = poster.height * scale;
    ctx.drawImage(poster, (pw - dw) / 2, (ph - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = ACCENT_SOFT;
    ctx.fillRect(0, 0, pw, ph);
    ctx.fillStyle = INK;
    ctx.font = `900 64px ${family}`;
    ctx.textAlign = "center";
    const lines = wrapTitle(ctx, title, pw - 120, 4);
    lines.forEach((line, i) => {
      ctx.fillText(line, pw / 2, ph / 2 + (i - (lines.length - 1) / 2) * 76);
    });
  }
  ctx.restore();
  ctx.restore();

  // ---- my-rating sticker, overlapping the poster's corner ----------------
  // (the community average lives in the stats sticker up top)
  if (input.myRating != null && input.myRating > 0) {
    const label = `${input.myRating}/10`;
    ctx.save();
    ctx.font = `900 52px ${family}`;
    const textW = ctx.measureText(label).width;
    const stickerW = textW + 148;
    const stickerH = 104;
    ctx.translate(px + pw - 60, py + ph - 26);
    ctx.rotate((5 * Math.PI) / 180);

    // hard offset shadow — sticker elements get the cartoon shadow
    ctx.fillStyle = INK;
    roundRectPath(ctx, -stickerW / 2 + 6, -stickerH / 2 + 6, stickerW, stickerH, stickerH / 2);
    ctx.fill();
    ctx.fillStyle = ACCENT_SOFT;
    roundRectPath(ctx, -stickerW / 2, -stickerH / 2, stickerW, stickerH, stickerH / 2);
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    roundRectPath(ctx, -stickerW / 2, -stickerH / 2, stickerW, stickerH, stickerH / 2);
    ctx.stroke();

    starPath(ctx, -stickerW / 2 + 62, 0, 26);
    ctx.fillStyle = INK;
    ctx.fill();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, -stickerW / 2 + 104, 4);
    ctx.restore();
  }

  // ---- stats sticker, top-right corner ------------------------------------
  {
    const rows: { star?: boolean; text: string }[] = [];
    if (input.rating > 0) rows.push({ star: true, text: `${input.rating.toFixed(1)} avg` });
    if (input.mediaType === "movie" && input.runtime) {
      const h = Math.floor(input.runtime / 60);
      const m = input.runtime % 60;
      rows.push({ text: h > 0 ? `${h}h ${m}m` : `${m}m` });
    } else if (input.mediaType === "tv") {
      rows.push({ text: "series" });
    }
    const genreLine = (input.genres ?? []).filter(Boolean).slice(0, 2).join(" · ").toLowerCase();
    if (genreLine) rows.push({ text: genreLine });

    if (rows.length > 0) {
      ctx.save();
      ctx.font = `800 30px ${family}`;
      const rowW = (r: { star?: boolean; text: string }) =>
        ctx.measureText(r.text).width + (r.star ? 44 : 0);
      const innerW = Math.max(...rows.map(rowW));
      const stickerW = Math.min(innerW + 76, 360);
      const rowH = 48;
      const stickerH = rows.length * rowH + 34;
      // hangs off the poster's top-right corner like a slapped-on sticker
      ctx.translate(px + pw + 12, py + 96);
      ctx.rotate((5 * Math.PI) / 180);

      ctx.fillStyle = INK;
      roundRectPath(ctx, -stickerW / 2 + 6, -stickerH / 2 + 6, stickerW, stickerH, 26);
      ctx.fill();
      ctx.fillStyle = CARD;
      roundRectPath(ctx, -stickerW / 2, -stickerH / 2, stickerW, stickerH, 26);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = INK;
      roundRectPath(ctx, -stickerW / 2, -stickerH / 2, stickerW, stickerH, 26);
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      rows.forEach((row, i) => {
        const y = -stickerH / 2 + 34 + i * rowH + rowH / 2 - 14;
        let x = -stickerW / 2 + 34;
        if (row.star) {
          starPath(ctx, x + 15, y, 17);
          ctx.fillStyle = ACCENT;
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = INK;
          ctx.stroke();
          x += 44;
        }
        ctx.fillStyle = INK;
        let text = row.text;
        while (text.length > 1 && ctx.measureText(text).width > stickerW - (x + stickerW / 2) - 26) {
          text = text.slice(0, -1).trimEnd();
        }
        ctx.fillText(text, x, y);
      });
      ctx.restore();
    }
  }

  // ---- title with amber offset shadow ------------------------------------
  let titleSize = 92;
  ctx.font = `900 ${titleSize}px ${family}`;
  let lines = wrapTitle(ctx, title, W - 160, 2);
  if (lines.length > 1) {
    titleSize = 76;
    ctx.font = `900 ${titleSize}px ${family}`;
    lines = wrapTitle(ctx, title, W - 160, 2);
  }
  const lineGap = titleSize * 1.08;
  const titleY = 1420;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const offset = Math.round(titleSize * 0.045);
  lines.forEach((line, i) => {
    ctx.fillStyle = ACCENT_SOFT;
    ctx.fillText(line, W / 2 + offset, titleY + i * lineGap + offset);
    ctx.fillStyle = INK;
    ctx.fillText(line, W / 2, titleY + i * lineGap);
  });

  // ---- site link below the title -----------------------------------------
  const host =
    typeof window !== "undefined" ? window.location.host.toLowerCase() : "watchlr";
  const hostY = titleY + (lines.length - 1) * lineGap + 84;
  ctx.font = `800 40px ${family}`;
  ctx.fillStyle = ACCENT;
  ctx.fillText(host, W / 2, hostY);

  // ---- creation date + time ----------------------------------------------
  const now = new Date();
  const stamp = `${now
    .toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    .toLowerCase()} · ${now
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .toLowerCase()}`;
  ctx.font = `700 28px ${family}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(stamp, W / 2, hostY + 58);

  // ---- sarcastic one-liner just below the stamp --------------------------
  const tagline = input.tagline?.trim().toLowerCase();
  if (tagline) {
    ctx.font = `700 34px ${family}`;
    ctx.fillStyle = INK;
    const tagLines = wrapTitle(ctx, `"${tagline}"`, W - 200, 2);
    tagLines.forEach((line, i) => {
      ctx.fillText(line, W / 2, hostY + 128 + i * 46);
    });
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("could not render card"))),
      "image/png",
    );
  });
}
