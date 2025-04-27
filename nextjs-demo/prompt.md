# Prompt to build a connect wallet home page

Internal - Command to retrieve the context from the embedded tokens
* `bun run search ""`
* context is 10.5k tokens

The goal is to:

1. Create a landing page in `page.tsx` where you can connect your web3 browser wallet
using **thirdweb** SDK.
2. After we have an aesthetic landing page we have to connect to ethereum mainnet and be able
   for the wallet to check how much ETH and USDC he has and also be able to make transfers to
   other addresses. (No mocking data).

Resources:
- The SDK client id is: `<insert client_id>`
- Rely on thirdweb's SDK for all web3 primitives
- You already know USDC contract address
- Use preferably the UI components (shadcn) you have at `components/ui` 
- You can freely override components with their props or use plain tailwindcss to make them more unique
- Bun is our package manager

Other instructions:
- Try to apply custom styling so that you give the website a more appealing look, and not just
  the default shadcn styles
- Everything from thirdweb is under the package `thirdweb`. `@thirdweb-dev` is deprecated.
  
CONTEXT FOR THIRDWEB

`./context.txt`
