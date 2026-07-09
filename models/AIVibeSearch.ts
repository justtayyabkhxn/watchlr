import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const VibeItemSchema = new Schema(
  {
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    title: { type: String, required: true },
    posterPath: { type: String, default: null },
    releaseDate: { type: String, default: "" },
    voteAverage: { type: Number, default: 0 },
    genreIds: { type: [Number], default: [] },
    reason: { type: String, default: "" },
  },
  { _id: false },
);

/**
 * Cached vibe-search results keyed by the normalized query. Same query,
 * same answer — one Groq call per phrasing, per prompt version.
 */
const AIVibeSearchSchema = new Schema(
  {
    query: { type: String, required: true },
    model: { type: String, required: true },
    items: { type: [VibeItemSchema], default: [] },
  },
  { timestamps: true },
);

AIVibeSearchSchema.index({ query: 1, model: 1 }, { unique: true });
// Vibe phrasings are long-tail — let stale ones age out instead of piling up.
AIVibeSearchSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export type AIVibeSearchDoc = InferSchemaType<typeof AIVibeSearchSchema>;

export const AIVibeSearch: Model<AIVibeSearchDoc> =
  mongoose.models.AIVibeSearch ??
  mongoose.model("AIVibeSearch", AIVibeSearchSchema);
