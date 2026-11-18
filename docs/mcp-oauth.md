# Noctis MCP: sign in with OAuth

Connect an MCP client by signing in to Noctis instead of pasting a token. The client finds the
sign-in page by itself; you click **Allow**. Static `MCP_TOKENS` keep working next to it.

```
Claude ──POST /mcp (no token)──► 401  WWW-Authenticate: resource_metadata=…
       ──GET  /.well-known/oauth-protected-resource ──► "ask noctis-api for tokens"
       ──GET  /.well-known/oauth-authorization-server ──► endpoints
       ──POST /oauth/register ──► client_id               (once per app)
browser ──► noctis.julianwardana.dev/oauth/authorize ──► login if needed ──► Allow
       ◄── redirect back with ?code=…
Claude ──POST /oauth/token (code + PKCE verifier) ──► access token (1h) + refresh token (30d)
       ──POST /mcp  Authorization: Bearer nat_… ──► tools
```

## Setup (once)

Add to the api env in Dokploy, then redeploy:

```
API_PUBLIC_URL=https://noctis-api.julianwardana.dev
# Optional; defaults to the first WEB_ORIGIN:
# WEB_PUBLIC_URL=https://noctis.julianwardana.dev
```

Without `API_PUBLIC_URL` OAuth stays off and only static tokens work. `MCP_USER_ID` must be set:
only that account may approve a connection — any other account gets "can't connect apps".

Create the four OAuth tables after deploy: `pnpm --filter @noctis/db exec prisma db push` in the api container.

## Rules

| | |
|---|---|
| Scopes | `noctis:read` (read tools, resources, prompts) and `noctis:write` (everything else). The consent page has a tick box for write; unticked = read-only. Write tools are then hidden *and* refused. |
| Tokens | Access 1 hour, refresh 30 days. Every refresh returns a new refresh token and burns the old one. |
| Theft signals | An authorization code used twice, or an old refresh token used more than 60 s after it was rotated, revokes the whole connection. (The 60 s lets two runs refresh at once.) |
| Storage | Only SHA-256 hashes of codes and tokens are stored. |
| Clients | Public (`none`, e.g. Claude Code) or with a client secret (`client_secret_post` / `client_secret_basic`, e.g. Claude.ai). PKCE S256 is required for all. Redirect URIs: `https`, or `http` on localhost (any port, per RFC 8252). |
| Resource | Tokens are bound to `<API_PUBLIC_URL>/mcp`; a request for any other resource is refused. |
| Limits | Registration 10/hour per IP, token endpoint 30/min per IP. Unknown bearer tokens on `/mcp` count toward the existing 20-per-10-minutes limit; expired ones don't (that's a client that should refresh). |
| Revoke | Profile → **Connected apps** → Disconnect. Stops the app at once. |

Static tokens don't appear under Connected apps; remove them from `MCP_TOKENS` to revoke them.

## Connect

**Claude.ai** — Settings → Connectors → Noctis: remove the custom header, keep the URL
`https://noctis-api.julianwardana.dev/mcp`, then Connect. A Noctis tab opens; Allow.

**Claude Code**

```bash
claude mcp remove noctis --scope user   # if it was added with a header
claude mcp add --scope user --transport http noctis https://noctis-api.julianwardana.dev/mcp
```

Then `/mcp` → noctis → Authenticate. Tokens are kept by Claude Code, not in any repository.

## Checks

```sh
cd apps/api && pnpm exec tsx src/modules/oauth/oauth.core.check.ts
```
