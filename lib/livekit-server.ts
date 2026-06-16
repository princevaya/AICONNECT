import { EgressClient, EgressStatus } from "livekit-server-sdk";

let cachedEgressClient: EgressClient | null = null;

function normalizeLivekitHost(rawHost?: string | null): string {
  if (!rawHost) {
    throw new Error("LiveKit host is not configured");
  }

  const trimmed = rawHost.trim();
  if (!trimmed) {
    throw new Error("LiveKit host is not configured");
  }

  let normalized = trimmed;
  if (normalized.startsWith("wss://")) {
    normalized = normalized.replace("wss://", "https://");
  } else if (normalized.startsWith("ws://")) {
    normalized = normalized.replace("ws://", "http://");
  } else if (!normalized.startsWith("http")) {
    normalized = `https://${normalized}`;
  }

  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

export function getLivekitRestUrl() {
  const host =
    process.env.LIVEKIT_REST_URL ??
    process.env.LIVEKIT_HOST ??
    process.env.NEXT_PUBLIC_LIVEKIT_URL;

  return normalizeLivekitHost(host ?? undefined);
}

export function getEgressClient() {
  if (cachedEgressClient) {
    return cachedEgressClient;
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit API credentials are missing");
  }

  cachedEgressClient = new EgressClient(getLivekitRestUrl(), apiKey, apiSecret);
  return cachedEgressClient;
}

export function resetEgressClient() {
  cachedEgressClient = null;
}

function resolveStatusValue(
  status?: EgressStatus | keyof typeof EgressStatus | string | null
) {
  if (status === undefined || status === null) {
    return undefined;
  }

  if (typeof status === "number") {
    return status;
  }

  if (typeof status === "string") {
    const key = status as keyof typeof EgressStatus;
    const mapped = EgressStatus[key];
    if (typeof mapped === "number") {
      return mapped;
    }
  }

  return undefined;
}

export function isActiveEgressStatus(
  status?: EgressStatus | keyof typeof EgressStatus | string | null
) {
  const statusValue = resolveStatusValue(status);

  if (statusValue === undefined) {
    return false;
  }

  return (
    statusValue === EgressStatus.EGRESS_STARTING ||
    statusValue === EgressStatus.EGRESS_ACTIVE ||
    statusValue === EgressStatus.EGRESS_ENDING
  );
}

export function mapStatusToLegacyCode(
  status?: EgressStatus | keyof typeof EgressStatus | string | null
) {
  const statusValue = resolveStatusValue(status);

  if (statusValue === undefined) {
    return undefined;
  }

  switch (statusValue) {
    case EgressStatus.EGRESS_STARTING:
    case EgressStatus.EGRESS_ACTIVE:
      return 1;
    case EgressStatus.EGRESS_ENDING:
      return 2;
    case EgressStatus.EGRESS_COMPLETE:
      return 3;
    case EgressStatus.EGRESS_FAILED:
      return 4;
    case EgressStatus.EGRESS_ABORTED:
      return 5;
    case EgressStatus.EGRESS_LIMIT_REACHED:
      return 6;
    default:
      return undefined;
  }
}
