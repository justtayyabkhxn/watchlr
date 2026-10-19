import { Schema, type InferSchemaType } from "mongoose";
import { defineModel } from "@/lib/db";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    username: {
      type: String,
      unique: true,
      sparse: true, // pre-username accounts have none
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: /^[a-z0-9_]+$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 500 },
    favoriteGenres: { type: [String], default: [] },
    favoriteActors: { type: [String], default: [] },
    profilePrivate: { type: Boolean, default: false },
    hideHistory: { type: Boolean, default: false },
    hideReviews: { type: Boolean, default: false },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;

export const User = defineModel<UserDoc>("User", UserSchema);
