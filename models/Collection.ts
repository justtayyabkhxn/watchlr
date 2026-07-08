import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CollectionItemSchema = new Schema(
  {
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    title: { type: String, required: true },
    posterPath: { type: String, default: null },
  },
  { _id: false },
);

const CollectionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", maxlength: 300 },
    items: { type: [CollectionItemSchema], default: [] },
  },
  { timestamps: true },
);

CollectionSchema.index({ userId: 1, updatedAt: -1 });

export type CollectionDoc = InferSchemaType<typeof CollectionSchema>;

export const Collection: Model<CollectionDoc> =
  mongoose.models.Collection ?? mongoose.model("Collection", CollectionSchema);
