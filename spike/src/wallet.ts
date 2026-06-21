/**
 * Generate the wallets the spike needs: one funder (you fund this at the Circle
 * faucet) and three source sellers that receive attribution splits. Writes any
 * missing keys into .env and prints the funder address to fund.
 */
import 'dotenv/config';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const ENV = resolve(process.cwd(), '.env');

function gen(label: string) {
  const pk = generatePrivateKey();
  const addr = privateKeyToAccount(pk).address;
  console.log(`${label}\n  address:     ${addr}\n  privateKey:  ${pk}\n`);
  return { addr, pk };
}

const keys: Record<string, string> = {};
const need = (addrKey: string, pkKey: string, label: string) => {
  if (process.env[pkKey]) {
    console.log(`${label}: already in .env (${process.env[addrKey]})\n`);
    return;
  }
  const { addr, pk } = gen(label);
  keys[addrKey] = addr;
  keys[pkKey] = pk;
};

console.log('Touchstone spike wallets\n');
need('FUNDER_ADDRESS', 'FUNDER_PRIVATE_KEY', 'Funder (fund this one)');
need('SOURCE_A_ADDRESS', 'SOURCE_A_PRIVATE_KEY', 'Source A');
need('SOURCE_B_ADDRESS', 'SOURCE_B_PRIVATE_KEY', 'Source B');
need('SOURCE_C_ADDRESS', 'SOURCE_C_PRIVATE_KEY', 'Source C');

if (Object.keys(keys).length) {
  let content = existsSync(ENV) ? readFileSync(ENV, 'utf-8') : '';
  for (const [k, v] of Object.entries(keys)) {
    const re = new RegExp(`^${k}=.*$`, 'm');
    const line = `${k}=${v}`;
    content = re.test(content) ? content.replace(re, line) : content.trimEnd() + '\n' + line;
  }
  writeFileSync(ENV, content.trimEnd() + '\n');
  console.log(`Wrote new keys to ${ENV}`);
}

const funder = process.env.FUNDER_ADDRESS || keys.FUNDER_ADDRESS;
console.log(
  `\nNext: fund the funder with Arc testnet USDC.\n` +
    `  1. Open https://faucet.circle.com and select Arc Testnet.\n` +
    `  2. Paste: ${funder}\n` +
    `  3. Then run: npm run spike\n`,
);
