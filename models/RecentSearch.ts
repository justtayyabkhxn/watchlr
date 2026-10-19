import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "@/lib/db";

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

export const RecentSearch = defineModel<RecentSearchDoc>("RecentSearch", RecentSearchSchema);
