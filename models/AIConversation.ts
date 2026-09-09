import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SuggestedItemSchema = new Schema(
  {
    tmdbId: { type: Number, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], required: true },
    title: { type: String, required: true },
    posterPath: { type: String, default: null },
    releaseDate: { type: String, default: "" },
    voteAverage: { type: Number, default: 0 },
    genreIds: { type: [Number], default: [] },
    reason: { type: String, default: "" },
    /** true when it came off the user's own want-to-watch pile. */
    onShelf: { type: Boolean, default: false },
  },
  { _id: false },
);

const TurnSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true, maxlength: 4000 },
    items: { type: [SuggestedItemSchema], default: [] },
    chips: { type: [String], default: [] },
  },
  { _id: false },
);

/**
 * One live suggestion thread per user — the /tonight page reloads into
 * where they left it, because "what did it suggest again?" is the whole point
 * of a conversation you can't scroll back through.
 *
 * `constraints` lives on the thread rather than being re-derived per turn:
 * the user can delete a chip, and a deleted chip has to stay deleted.
 * `dismissed` is the other half of that — titles they actively turned down,
 * which is stronger signal than anything they simply never saw.
 */
const AIConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    turns: { type: [TurnSchema], default: [] },
    constraints: { type: [String], default: [] },
    dismissed: { type: [String], default: [] },
    model: { type: String, default: "" },
  },
  { timestamps: true },
);

export type AIConversationDoc = InferSchemaType<typeof AIConversationSchema>;

export const AIConversation: Model<AIConversationDoc> =
  mongoose.models.AIConversation ??
  mongoose.model("AIConversation", AIConversationSchema);
