import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Cached Movie of the Night lookups. Availability shifts daily at most,
 * so the API route treats entries older than 24h as stale and refetches —
 * repeat visits to a title cost zero RapidAPI quota.
 */
const StreamingAvailabilitySchema = new Schema(
  {
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    country: { type: String, required: true },
    options: { type: Array, required: true, default: [] },
    fetchedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

StreamingAvailabilitySchema.index(
  { tmdbId: 1, mediaType: 1, country: 1 },
  { unique: true },
);

export type StreamingAvailabilityDoc = InferSchemaType<
  typeof StreamingAvailabilitySchema
>;

export const StreamingAvailability: Model<StreamingAvailabilityDoc> =
  mongoose.models.StreamingAvailability ??
  mongoose.model("StreamingAvailability", StreamingAvailabilitySchema);
