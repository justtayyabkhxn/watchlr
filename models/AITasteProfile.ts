import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Cached "your taste, explained" roast per user. `signature` fingerprints
 * the taste signals — new watches/ratings change it and force a rewrite.
 */
const AITasteProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    signature: { type: String, required: true },
    content: { type: String, required: true },
    model: { type: String, required: true },
  },
  { timestamps: true },
);

export type AITasteProfileDoc = InferSchemaType<typeof AITasteProfileSchema>;

export const AITasteProfile: Model<AITasteProfileDoc> =
  mongoose.models.AITasteProfile ??
  mongoose.model("AITasteProfile", AITasteProfileSchema);
