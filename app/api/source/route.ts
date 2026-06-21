import { BatchFacilitatorClient } from '@circle-fin/x402-batching/server';
import { buildRequirements } from '@/lib/arc';
import { sourceById } from '@/lib/sources';
import { walletForId } from '@/lib/rss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// An x402-priced source endpoint. Charging `micros` USDC, paid to the source's
// wallet, settled through Circle Gateway. This is the toll booth a source sits
// behind: reading it costs a fraction of a cent. Static sources resolve their
// wallet from the registry; live (RSS) sources derive it deterministically from
// the id, so no shared state is needed.
const facilitator = new BatchFacilitatorClient();

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? '';
  const micros = parseInt(url.searchParams.get('micros') ?? '0', 10);
  const source = sourceById(id);
  const payTo = source?.payTo ?? walletForId(id);
  if (!id || micros <= 0) {
    return new Response(JSON.stringify({ error: 'unknown source' }), { status: 404 });
  }

  const requirements = buildRequirements(micros, payTo);
  const sig = request.headers.get('payment-signature');

  if (!sig) {
    const required = {
      x402Version: 2,
      resource: { url: url.pathname, description: source?.name ?? id, mimeType: 'application/json' },
      accepts: [requirements],
    };
    return new Response('{}', {
      status: 402,
      headers: {
        'content-type': 'application/json',
        'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(required)).toString('base64'),
      },
    });
  }

  try {
    const payload = JSON.parse(Buffer.from(sig, 'base64').toString('utf-8'));
    const verify = await facilitator.verify(payload, requirements);
    if (!verify.isValid) {
      return new Response(JSON.stringify({ error: verify.invalidReason }), { status: 402 });
    }
    const settle = await facilitator.settle(payload, requirements);
    if (!settle.success) {
      return new Response(JSON.stringify({ error: settle.errorReason }), { status: 402 });
    }
    return new Response(JSON.stringify({ content: source?.text ?? "", tx: settle.transaction }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'PAYMENT-RESPONSE': Buffer.from(
          JSON.stringify({ success: true, transaction: settle.transaction, payer: settle.payer }),
        ).toString('base64'),
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
}
