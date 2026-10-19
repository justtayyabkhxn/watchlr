import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "@/lib/db";

const RatingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    value: { type: Number, required: true, min: 1, max: 10 },
  },
  { timestamps: true },
);

RatingSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });
RatingSchema.index({ tmdbId: 1, mediaType: 1 });

export type RatingDoc = InferSchemaType<typeof RatingSchema>;

export const Rating = defineModel<RatingDoc>("Rating", RatingSchema);
