// ArcScan, the Arc testnet block explorer. Payments settle through Circle
// Gateway (gas-free and batched), so the per-payment reference is a Gateway
// transfer id, not a single tx hash. The verifiable on-chain anchor is the
// wallet itself, so we link each recipient to its address on ArcScan.
export const EXPLORER = 'https://testnet.arcscan.app';
export const addressUrl = (a: string) => `${EXPLORER}/address/${a}`;
export const txUrl = (h: string) => `${EXPLORER}/tx/${h}`;
