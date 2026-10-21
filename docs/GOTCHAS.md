# Gotchas (NetScaler 14.1 build 73.46)

Each of these stopped a deploy or a login. The template already contains the fix (#6, #8, #9: expected behaviour).

| # | Symptom | Cause | Fix |
|---|---|---|---|
| 1 | NITRO 839 "RDP file name should have .rdp extension and some special characters for RDP file name are not supported" | `rdpfilename` without `.rdp` (hyphens may also count as special characters) | `"rdpfilename": "jump01.rdp"` |
| 2 | NITRO 1095 "Required argument missing [psk]" on `rdpserverprofile` | 14.1 makes the PSK **mandatory** (the command reference lists it as optional) | random PSK per deploy via `$env:RDP_PSK`, the **same value** in client and server profile |
| 3 | NITRO 1232 "Invalid object name [vpnvserver_authorizationpolicy_binding]" (and `vpnglobal_authorizationpolicy_binding`) | authorization policies bind **only to AAA users or groups** | `defaultauthenticationgroup` on the OAuth action + `aaagroup` + `aaagroup_authorizationpolicy_binding` - no user names hard-coded |
| 4 | "No IntranetIP available" at `/cgi/setclient?cvpn` (ns.log "failed to get IIP") | the session action inherits the global `UseIIP: NOSPILLOVER` | `usemip NS` + `useiip OFF` on the session action - **both together** ("Both Mapped IP and Intranet IP must be specified") |
| 5 | "Error: Not a privileged User." at `/rdpproxy/<target>` (ns.log "is not authorized to access /rdpproxy/...") | with default DENY, authorization is also checked on the **HTTP request** to the Gateway, not only on the RDP connection | second allow rule `HTTP.REQ.URL.PATH.EQ("/rdpproxy/<target>")`, kept separate from the TCP rule (an HTTP expression on the TCP flow could evaluate UNDEF) |
| 6 | first launch: "Unknown publisher", all redirections unticked | Windows disables redirections for **unsigned** `.rdp` files | expected - user opts in per launch; NetScaler cannot sign `.rdp` files |
| 7 | OIDC login without any MFA prompt | an existing IdP session in the browser (SSO) and no per-app policy | Conditional Access per app: MFA + sign-in frequency **every time** (`docs/ENTRA.md`) |
| 8 | login loop: several sessions in a few seconds, each `Duration 00:00:00 LogoutMethod "TimedOut"` | stale NetScaler session cookie in an old browser tab (seen with Safari) | close the old tab / new tab; not a configuration error |
| 9 | after an HA failover mstsc "Reconnecting" fails (5 attempts), even after a fresh browser login | Gateway/RDP Proxy sessions are not synced to the secondary; the old mstsc window presents the token from the old `.rdp` file | by design - log in again and **download the `.rdp` again**; the Windows session on the jump host survives |

Things that worked as hoped:
- **Single port:** `rdpserverprofile -rdpPort` = the Gateway port (8462) is accepted and mstsc connects through it -
  no second port / NAT rule. RDP Proxy is TCP only (no UDP share needed).
- Smart card redirection (`rdpcustomparams redirectsmartcards:i:1`): the YubiKey is visible inside the session.
- HA: the whole config incl. RDP profiles syncs to the secondary.

Resource names verified by CLI before the deploy (CLI argument = NITRO field): `bind aaa group -policy -priority
-type REQUEST`, `bind vpn vserver -portaltheme`, `bind vpn vserver -urlName`, `add authentication OAuthAction ...
-defaultAuthenticationGroup`.
