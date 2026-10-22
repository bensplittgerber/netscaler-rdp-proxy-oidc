# Changelog

## v1.0.0 - 2026-10-23

First release. RDP-only admin Gateway on NetScaler 14.1: OIDC login, a portal with exactly one RDP bookmark, mstsc
through NetScaler RDP Proxy on a single TCP port. Verified on NetScaler 14.1 build 73.46 (Express/freemium license),
standalone and HA pair; the template was deployed and undone end to end on an HA pair before the release.

Requires [netscaler-nitro](https://github.com/bensplittgerber/netscaler-nitro) v1.2.0 (`Deploy-NsObjects.ps1` /
`Undo-NsObjects.ps1`).

### Added
- `nitro/rdp-gateway.json`: complete config as one deploy file - RDP client + server profile (single port, PSK per
  deploy from `$env:RDP_PSK`), OIDC action (Entra ID example, PKCE, client secret from `$env:OIDC_RDP_CLIENT_SECRET`),
  nFactor AAA vserver, clientless session without ICA, default DENY with two allow rules (HTTP `/rdpproxy/<target>`
  + TCP target:3389) through an AAA group, the bookmark, the Gateway vserver and frontend SSL profile.
- `theme/th_rdp/`: portal theme based on RfWebUI - hides Favorites, Add/Remove and personal bookmarks and opens on
  Desktops. RfWebUI favorites fail with "Cannot Add App" because the built-in `ns-web-default-appfw-profile`
  (API spec `ns-web-spec`) blocks `PersonalBookmark.pl` and `subscription.pl`; nothing in the config turns them off.
- `docs/ENTRA.md`: app registration and a Conditional Access policy per app (MFA, sign-in frequency every time)
  with Microsoft Graph PowerShell.
- `docs/GOTCHAS.md`: ten findings on 14.1 that stopped a deploy or a login, each with the fix.
- `docs/SCREENSHOTS.md`: the flow and the errors on the way, names replaced by placeholders.
- README: flow, deploy and test steps, HA failover behaviour (a new `.rdp` download is needed to reconnect), the two
  separate gates (Gateway identity vs. Windows logon) and why Entra authentication for RDP does not work through the
  proxy.
