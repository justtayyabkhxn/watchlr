import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PickedItemSchema = new Schema(
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
 * Cached AI recommendations per user. `signature` fingerprints the user's
 * taste signals — new watches/ratings change it and force a regeneration.
 */
const AIPickSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    signature: { type: String, required: true },
    movies: { type: [PickedItemSchema], default: [] },
    shows: { type: [PickedItemSchema], default: [] },
    model: { type: String, required: true },
  },
  { timestamps: true },
);

export type AIPickDoc = InferSchemaType<typeof AIPickSchema>;

export const AIPick: Model<AIPickDoc> =
  mongoose.models.AIPick ?? mongoose.model("AIPick", AIPickSchema);
