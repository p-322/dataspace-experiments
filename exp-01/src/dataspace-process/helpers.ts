const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const BLUE = "\x1b[34m";

export const provider = (msg: string) =>
  `${BOLD}${CYAN}[provider]${RESET} ${msg}`;

export const consumer = (msg: string) =>
  `${BOLD}${MAGENTA}[consumer]${RESET} ${msg}`;

export const edc = (msg: string) => `${BOLD}${BLUE}[edc]${RESET} ${msg}`;

export const step = (title: string) => `${BOLD}${title}${RESET}`;
