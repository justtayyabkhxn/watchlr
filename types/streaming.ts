/** Normalized Movie of the Night (Streaming Availability API) shapes. */

export type StreamingOptionType =
  | "subscription"
  | "free"
  | "rent"
  | "buy"
  | "addon";

/** One way to watch a title on one service, with a deep link. */
export interface StreamingOption {
  serviceId: string;
  serviceName: string;
  /** SVG logo URLs from Movie of the Night's CDN. */
  logoLight: string;
  logoDark: string;
  themeColor: string;
  type: StreamingOptionType;
  /** Channel name when type is "addon" (e.g. "Paramount+ on Prime"). */
  addonName: string | null;
  /** Deep link straight to the title on the service. */
  link: string;
  quality: string | null; // "sd" | "hd" | "uhd"
  price: string | null; // pre-formatted, e.g. "$3.99"
  expiresSoon: boolean;
  expiresOn: string | null; // ISO date when it leaves the service
}

export interface StreamingAvailabilityPayload {
  country: string;
  options: StreamingOption[];
}
