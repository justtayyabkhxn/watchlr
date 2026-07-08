import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const LIBRARY_STATUSES = [
  "watching",
  "completed",
  "want_to_watch",
  "dropped",
  "favorite",
  "hidden",
] as const;

export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

const WatchlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    status: { type: String, enum: LIBRARY_STATUSES, required: true },
    title: { type: String, required: true },
    posterPath: { type: String, default: null },
    voteAverage: { type: Number, default: 0 },
    genreIds: { type: [Number], default: [] },
    releaseDate: { type: String, default: "" },
  },
  { timestamps: true },
);

WatchlistSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });
WatchlistSchema.index({ userId: 1, status: 1, updatedAt: -1 });

export type WatchlistDoc = InferSchemaType<typeof WatchlistSchema>;

export const Watchlist: Model<WatchlistDoc> =
  mongoose.models.Watchlist ?? mongoose.model("Watchlist", WatchlistSchema);
