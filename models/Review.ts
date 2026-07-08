import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ReviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    content: { type: String, required: true, maxlength: 4000 },
    hasSpoilers: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ReviewSchema.index({ tmdbId: 1, mediaType: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });

export type ReviewDoc = InferSchemaType<typeof ReviewSchema>;

export const Review: Model<ReviewDoc> =
  mongoose.models.Review ?? mongoose.model("Review", ReviewSchema);
