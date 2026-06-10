# Assay demo video script (3 to 5 minutes)

Tone: calm, precise, a little dry. No hype. Let the product be the proof.

## 0:00 to 0:30, The gap

On camera: the Assay masthead.

"Cobo Agentic Wallet lets you give an AI agent a wallet with guardrails. Caps,
spend limits, allowlists. Those guardrails are quantitative. They answer one
question: is this transaction within bounds?

There is a second question they never ask: is this the transaction the agent was
supposed to make? A payment can be perfectly in bounds and still be the wrong
payment. A prompt injection. A hallucination. Goal drift."

## 0:30 to 1:10, We proved it on testnet

Cut to the spike summary / README testnet evidence.

"We tested this on the live Cobo testnet before building anything. One pact, one
intent: pay verified supplier invoices. We sent three transfers.

In bounds and to the supplier: signed. Over the cap: denied, cleanly, with a
structured policy error. And then a third transfer, in bounds, to the same
allowlisted supplier, but with nothing to do with any invoice. The wallet signed
it. Zero questions.

That third transfer is the whole problem. It is in policy, and it is wrong."

## 1:10 to 1:40, What Assay is

Back to the masthead. Point to the mandate and the policy block.

"Assay sits between the agent and the wallet. It reads the pact's stated intent,
it reads the agent's reasoning for each step, and it makes one judgment: does
this operation conform to the mandate? Pass, hold, or block. Only a pass reaches
the wallet."

## 1:40 to 3:00, The hero run

Press **Run the agent session**. Narrate as rows resolve.

"The agent is paying invoices. First payment, to Northgate Components, a verified
supplier, in cap. Assay reads the reasoning, it tracks the mandate, pass." (The
hallmark strikes the row.) "The wallet signs it."

"Second payment. The agent submits the full invoice total, but it is over the
cap. Assay passes the intent, and now you see Cobo's own layer do its job: the
wallet denies it, transfer limit exceeded. That is the quantitative guardrail
working exactly as designed."

"Third payment. Here is an urgent note that turned up in the invoice inbox:
Northgate changed banks, reroute the payment to the other approved vendor
immediately. The agent follows it. Forty-eight USDC to Lumen Logistics. Lumen is
on the allowlist. The amount is under the cap." (Point to the line: CAW would
have signed this.) "The wallet would sign this without a question.

Assay holds it." (The oxide streak draws across the row.) "Off intent. The
reasoning is driven by an out-of-band instruction, not by a verified invoice. It
never reaches the wallet. A human gets to decide."

## 3:00 to 3:40, The two layers, the human

Point at the three rows together.

"Two layers, visible at once. The wallet caught what was out of bounds. Assay
caught what was in bounds but wrong. And the one it caught is the one that would
have cost you the money.

The held payment waits for a person. Sign anyway, or discard. The genuine metal
takes the hallmark. The base metal oxidizes when you assay it."

## 3:40 to 4:10, Close

Back to the masthead.

"Cobo gives agents a wallet with real limits. Assay makes sure the agent is
spending it on what it was actually told to do. That is the difference between a
transaction that is allowed and a transaction that is right."
