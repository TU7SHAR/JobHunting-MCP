# Exposing the Oracle Qwen model to JobPilot

JobPilot talks to **Ollama's** HTTP API (`/api/chat`, `/api/tags`). The model
(`qwen2.5:3b`) runs on the Oracle VM. This guide is the exact working setup.

## The gotchas we hit (so you don't again)

1. **`trycloudflare.com` URLs are ephemeral.** Every time you restart
   `cloudflared`, you get a NEW random URL. The old one dies. For a stable URL,
   use a *named* Cloudflare tunnel (see bottom).
2. **Ollama rejects non-localhost `Host` headers with `403`.** Traffic through a
   tunnel arrives with a `trycloudflare.com` host, so Ollama refuses it unless
   you set `OLLAMA_ORIGINS`.
3. **Model store is per-user.** The systemd `ollama` service stores models under
   `/usr/share/ollama/.ollama/models`. Running `ollama serve` manually as
   `ubuntu` looks in `/home/ubuntu/.ollama/models`, which may be empty — re-pull
   the model there, or run via systemd.

## Working recipe (manual, quick)

Three terminals on the VM (`ssh ubuntu@<oracle-ip>`):

**Terminal 1 — Ollama, listening on all interfaces, any origin allowed:**
```bash
sudo systemctl stop ollama
OLLAMA_HOST=0.0.0.0:11434 OLLAMA_ORIGINS='*' ollama serve
```

**Terminal 2 — make sure the model exists for THIS server:**
```bash
ollama pull qwen2.5:3b
ollama list          # should show qwen2.5:3b
```

**Terminal 3 — tunnel to Ollama's port:**
```bash
cloudflared tunnel --url http://localhost:11434
```
Copy the printed `https://<random>.trycloudflare.com` URL.

**Verify from anywhere:**
```bash
curl -s https://<random>.trycloudflare.com/api/tags        # lists qwen2.5:3b
curl -s https://<random>.trycloudflare.com/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5:3b","messages":[{"role":"user","content":"say OK"}],"stream":false}'
```

Then set in JobPilot (`.env.local` or Vercel env):
```bash
OLLAMA_BASE_URL=https://<random>.trycloudflare.com
OLLAMA_MODEL=qwen2.5:3b
```

## Persistent version (recommended)

Make Ollama's origin setting survive reboots:
```bash
sudo systemctl edit ollama
```
Add:
```ini
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_ORIGINS=*"
```
Then:
```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

For a **stable tunnel URL** (no more changing links) use a named tunnel:
<https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/>

## Security note

A quick tunnel + `OLLAMA_ORIGINS=*` means **anyone with the URL can use your
model** (no auth). On the free tier this is a DoS risk. To lock it down, put a
tiny token-checking reverse proxy (Caddy/Nginx or Cloudflare Access) in front of
Ollama and set `OLLAMA_AUTH_TOKEN` in JobPilot — the app sends it as
`Authorization: Bearer <token>` automatically.
