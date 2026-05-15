import type { FeedbackType, FeedbackVisibility, IFeedback } from "../index.js";

export interface FeedbackIdParams {
  feedbackId: string;
}

export type ListFeedbackResponse = IFeedback[];

export interface CreateFeedbackBody {
  type: FeedbackType;
  content: string;
  visibility: FeedbackVisibility;
}

export type CreateFeedbackResponse = IFeedback;

export interface UpdateFeedbackBody {
  type?: FeedbackType;
  content?: string;
  visibility?: FeedbackVisibility;
}

export type UpdateFeedbackResponse = IFeedback;
