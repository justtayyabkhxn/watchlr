import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "@/lib/db";

export const SUMMARY_TYPES = [
  "spoiler_free",
  "detailed",
  "ending_explained",
  "themes",
  "should_i_watch",
  "sarcastic_tagline", // one-liner for the shareable story card
  "internet_verdict", // generated from real TMDB reviews, not the synopsis
] as const;

export type SummaryType = (typeof SUMMARY_TYPES)[number];

const AISummarySchema = new Schema(
  {
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    summaryType: { type: String, enum: SUMMARY_TYPES, required: true },
    content: { type: String, required: true },
    model: { type: String, required: true },
  },
  { timestamps: true },
);

AISummarySchema.index(
  { tmdbId: 1, mediaType: 1, summaryType: 1 },
  { unique: true },
);

export type AISummaryDoc = InferSchemaType<typeof AISummarySchema>;

export const AISummary = defineModel<AISummaryDoc>("AISummary", AISummarySchema);
