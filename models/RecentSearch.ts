import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const RecentSearchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    query: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { timestamps: true },
);

RecentSearchSchema.index({ userId: 1, updatedAt: -1 });
RecentSearchSchema.index({ userId: 1, query: 1 }, { unique: true });

export type RecentSearchDoc = InferSchemaType<typeof RecentSearchSchema>;

export const RecentSearch: Model<RecentSearchDoc> =
  mongoose.models.RecentSearch ??
  mongoose.model("RecentSearch", RecentSearchSchema);
