import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const WatchHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    title: { type: String, required: true },
    posterPath: { type: String, default: null },
    runtime: { type: Number, default: 0 }, // minutes
    genreIds: { type: [Number], default: [] },
    seasonNumber: { type: Number },
    episodeNumber: { type: Number },
    // "log" = marked watched manually, "stream" = played in the built-in player
    source: { type: String, enum: ["log", "stream"], default: "log" },
    watchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

WatchHistorySchema.index({ userId: 1, watchedAt: -1 });
WatchHistorySchema.index(
  { userId: 1, tmdbId: 1, mediaType: 1, seasonNumber: 1, episodeNumber: 1 },
  { unique: true },
);

export type WatchHistoryDoc = InferSchemaType<typeof WatchHistorySchema>;

export const WatchHistory: Model<WatchHistoryDoc> =
  mongoose.models.WatchHistory ??
  mongoose.model("WatchHistory", WatchHistorySchema);
