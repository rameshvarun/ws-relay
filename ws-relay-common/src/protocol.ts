import { z } from "zod";

/** A valid peerID. */
export const PeerID = z.string().nonempty();

/** Represents a message from the client to the server. */
export const ClientMessage = z.union([
  z.object({
    kind: z.literal("register"),
    id: z.optional(PeerID),
  }),
  z.object({
    kind: z.literal("connect"),
    peerID: PeerID,
  }),
  z.object({
    kind: z.literal("send"),
    peerID: PeerID,
    data: z.any(),
  }),
  z.object({
    kind: z.literal("close"),
    peerID: PeerID,
  }),
]);

export type ClientMessage = z.output<typeof ClientMessage>;

/** Represents a message from the server to the client. */
export const ServerMessage = z.union([
  z.object({
    kind: z.literal("registration-success"),
    id: PeerID,
  }),
  z.object({
    kind: z.literal("registration-failure"),
    message: z.string(),
  }),
  z.object({
    kind: z.literal("connect-failure"),
    peerID: PeerID,
    message: z.string(),
  }),
  z.object({
    kind: z.literal("connect-success"),
    peerID: PeerID,
  }),
  z.object({
    kind: z.literal("peer-connected"),
    peerID: PeerID,
  }),
  z.object({
    kind: z.literal("peer-disconnected"),
    peerID: PeerID,
  }),
  z.object({
    kind: z.literal("peer-data"),
    peerID: PeerID,
    data: z.any(),
  }),
  z.object({
    kind: z.literal("send-failure"),
    peerID: PeerID,
    message: z.string(),
  }),
]);

export type ServerMessage = z.output<typeof ServerMessage>;