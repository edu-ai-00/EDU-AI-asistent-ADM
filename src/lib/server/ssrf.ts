import { lookup } from "dns/promises";
import { isIP } from "net";

const BLOCKED_HOSTS = new Set([
  "metadata.google.internal",
  "metadata",
  "metadata.goog",
  "169.254.169.254",
  "fd00:ec2::254",
]);

export interface SsrfCheck {
  ok: boolean;
  reason?: string;
  url?: URL;
}

/**
 * Validate URL is safe for server-side fetch.
 * Blocks: non-allowed schemes, private/loopback/link-local IPs, cloud metadata.
 */
export async function validateExternalUrl(
  rawUrl: string,
  opts: { allowedSchemes?: string[]; maxLength?: number } = {},
): Promise<SsrfCheck> {
  const allowedSchemes = opts.allowedSchemes ?? ["http:", "https:"];
  const maxLength = opts.maxLength ?? 2048;

  if (typeof rawUrl !== "string" || rawUrl.length > maxLength) {
    return { ok: false, reason: "invalid_url" };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (!allowedSchemes.includes(url.protocol)) {
    return { ok: false, reason: "scheme_not_allowed" };
  }

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) {
    return { ok: false, reason: "blocked_host" };
  }

  // Resolve all addresses; reject if any private.
  const ips: string[] = [];
  if (isIP(host)) {
    ips.push(host);
  } else {
    try {
      const records = await lookup(host, { all: true });
      for (const r of records) ips.push(r.address);
    } catch {
      return { ok: false, reason: "dns_failed" };
    }
  }

  if (ips.length === 0) {
    return { ok: false, reason: "dns_failed" };
  }

  for (const ip of ips) {
    if (isPrivateIp(ip)) {
      return { ok: false, reason: "private_ip" };
    }
  }

  return { ok: true, url };
}

function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return isPrivateIPv4(ip);
  if (v === 6) return isPrivateIPv6(ip);
  return true; // fail closed
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  // 0.0.0.0/8, 10/8, 127/8, 169.254/16, 172.16/12, 192.168/16, 100.64/10 (CGNAT),
  // 192.0.0.0/24, 198.18/15, 224/4 (multicast), 240/4 (reserved), 255.255.255.255
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  // Loopback / unspecified.
  if (lower === "::1" || lower === "::") return true;
  // Unique local fc00::/7.
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  // Link-local fe80::/10.
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
  // IPv4-mapped ::ffff:0:0/96.
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    if (isIP(v4) === 4) return isPrivateIPv4(v4);
  }
  return false;
}
