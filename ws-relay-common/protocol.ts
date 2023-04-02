import { z } from "zod";

/** Represents a message from the client to the server. */
export const ClientMessage = z.union([
  z.object({
    kind: z.literal("register"),
    id: z.optional(z.string()),
  }),
  z.object({
    kind: z.literal("connect"),
    peerID: z.string(),
  }),
  z.object({
    kind: z.literal("send"),
    peerID: z.string(),
    data: z.any(),
  }),
  z.object({
    kind: z.literal("close"),
    peerID: z.string(),
  }),
]);

export type ClientMessage = z.output<typeof ClientMessage>;

// Represents a message from the server to the client.
export type ServerMessage =
  | {
      kind: "registration-success";
      id: string;
    }
  | {
      kind: "registration-failure";
      message: string;
    }
  | {
      kind: "connect-failure";
      peerID: string;
      message: string;
    }
  | {
      kind: "connect-success";
      peerID: string;
    }
  | {
      kind: "peer-connected";
      peerID: string;
    }
  | {
      kind: "peer-disconnected";
      peerID: string;
    }
  | {
      kind: "peer-data";
      peerID: string;
      data: any;
    }
  | {
      kind: "send-failure";
      peerID: string;
      message: string;
    };
