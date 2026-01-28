// src/utils/log.ts
import { createHash } from "node:crypto";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const BLUE = "\x1b[34m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";

export type Channel = "provider" | "consumer" | "edc" | "warn" | "error";

function tag(label: string, color: string) {
  return `${BOLD}${color}[${label}]${RESET}`;
}

const TAG: Record<Channel, string> = {
  provider: tag("provider", CYAN),
  consumer: tag("consumer", MAGENTA),
  edc: tag("edc", BLUE),
  warn: tag("warn", YELLOW),
  error: tag("error", RED),
};

export type PrintOpts = {
  /** Print a blank line before this line only */
  nl?: boolean;

  /** Optional prefix inserted after the tag, e.g. "[consumer-1]" */
  ctx?: string;
};

export type TokenOpts = PrintOpts & {
  /**
   * If true, prints the raw token (generally unsafe).
   * Keep false for normal runs.
   */
  raw?: boolean;
};

function fmtCtx(ctx?: string) {
  const t = (ctx ?? "").trim();
  return t ? `${t} ` : "";
}

function fingerprint12(value: string) {
  const hex = createHash("sha256").update(value).digest("hex");
  return hex.slice(0, 12);
}

type TxChannel = "provider" | "consumer" | "edc";

export class Logger {
  constructor(private readonly fixedCtx?: string) {}

  /* ------------------------------------------------------------
   * Formatting helpers (strings)
   * ------------------------------------------------------------ */

  step(title: string) {
    return `${BOLD}${title}${RESET}`;
  }

  dim(s: string) {
    return `${DIM}${s}${RESET}`;
  }

  private withCtx<T extends PrintOpts>(opts?: T): T {
    if (!this.fixedCtx) return (opts ?? {}) as T;
    if (opts?.ctx) return opts;
    return { ...(opts ?? {}), ctx: this.fixedCtx } as T;
  }

  format(channel: Channel, msg: string, opts: PrintOpts = {}) {
    const o = this.withCtx(opts);
    return `${TAG[channel]} ${fmtCtx(o.ctx)}${msg}`;
  }

  /* ------------------------------------------------------------
   * Printing helpers
   * ------------------------------------------------------------ */

  private println(line: string, nl?: boolean) {
    if (nl) console.log("");
    console.log(line);
  }

  s(title: string, opts: PrintOpts = {}) {
    const o = this.withCtx(opts);
    // Step lines have no channel tag; keep ctx appended for consistency.
    if (o.nl) console.log("");
    const ctx = o.ctx ? ` ${o.ctx}` : "";
    console.log(`${this.step(title)}${ctx}`);
  }

  p(msg: string, opts: PrintOpts = {}) {
    const o = this.withCtx(opts);
    this.println(this.format("provider", msg, o), o.nl);
  }

  c(msg: string, opts: PrintOpts = {}) {
    const o = this.withCtx(opts);
    this.println(this.format("consumer", msg, o), o.nl);
  }

  e(msg: string, opts: PrintOpts = {}) {
    const o = this.withCtx(opts);
    this.println(this.format("edc", msg, o), o.nl);
  }

  w(msg: string, opts: PrintOpts = {}) {
    const o = this.withCtx(opts);
    this.println(this.format("warn", msg, o), o.nl);
  }

  err(msg: string, opts: PrintOpts = {}) {
    const o = this.withCtx(opts);
    this.println(this.format("error", msg, o), o.nl);
  }

  token(
    channel: TxChannel,
    label: string,
    token: string | null | undefined,
    opts: TokenOpts = {}
  ) {
    const o = this.withCtx(opts);
    const t = token ?? "";
    if (!t) {
      this.by(channel, `${label}: (missing)`, o);
      return;
    }

    if (o.raw) {
      this.by(channel, `${label}: ${t}`, o);
      return;
      o;
    }

    this.by(channel, `${label}: fp=${fingerprint12(t)} len=${t.length}`, o);
  }

  private by(channel: TxChannel, msg: string, opts: PrintOpts) {
    if (channel === "provider") this.p(msg, opts);
    else if (channel === "consumer") this.c(msg, opts);
    else this.e(msg, opts);
  }

  scoped(ctx: string): Logger {
    return new Logger(ctx);
  }
}

export const log = new Logger();
