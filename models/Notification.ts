import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["achievement", "system", "reminder"],
      default: "system",
    },
    message: { type: String, required: true, maxlength: 500 },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export type NotificationDoc = InferSchemaType<typeof NotificationSchema>;

export const Notification: Model<NotificationDoc> =
  mongoose.models.Notification ??
  mongoose.model("Notification", NotificationSchema);
