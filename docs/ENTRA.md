# Entra ID: app registration + Conditional Access per app

Other OIDC IdPs (Okta, Keycloak, ...) work the same way: a dedicated client for this Gateway, the user restricted to
the admins, and an MFA rule for this client only.

## App registration (one app per Gateway)
- Single tenant, platform **Web**, redirect URI `https://rdp.example.org:8462/oauth/login`.
- API permissions (delegated, Microsoft Graph): `openid`, `profile` (`User.Read` default is fine), admin consent.
  `preferred_username` (the user name NetScaler uses) comes with `profile`.
- Client secret -> only into the masked prompt of the deploy, never into a file.
- Enterprise application: **Assignment required = Yes**, assign only the admin users / group.
  Without it, every user of the tenant can log in to the Gateway.

## Conditional Access policy (needs Entra ID P1)
Without it, an existing Entra session in the browser logs in silently. The policy targets **only this app**, so
other apps are not affected. `includeUsers = All` is deliberate: the app assignment decides WHO gets in, the policy
then applies to everybody admitted - a newly assigned admin is covered automatically (a policy bound to single
user IDs would let a new assignee in WITHOUT the MFA rule). Created in **report-only** first. Exclude a break-glass account.

```powershell
Install-Module Microsoft.Graph.Identity.SignIns, Microsoft.Graph.Users -Scope CurrentUser   # once
Connect-MgGraph -Scopes Policy.ReadWrite.ConditionalAccess, Policy.Read.All, Application.Read.All, User.Read.All
$appId      = '<CLIENT_ID>'
$admin      = (Get-MgUser -UserId 'admin@example.org').Id
$breakGlass = (Get-MgUser -UserId 'breakglass@example.onmicrosoft.com').Id
$policy = @{
  displayName   = 'CA - RDP admin gateway - MFA every time'
  state         = 'enabledForReportingButNotEnforced'
  conditions    = @{
    applications   = @{ includeApplications = @($appId) }
    users          = @{ includeUsers = @(All); excludeUsers = @($breakGlass) }   # All = every user ADMITTED to this app (assignment)
    clientAppTypes = @('all')
  }
  grantControls   = @{ operator = 'OR'; builtInControls = @('mfa') }
  sessionControls = @{ signInFrequency = @{ isEnabled = $true; frequencyInterval = 'everyTime';
                                            authenticationType = 'primaryAndSecondaryAuthentication' } }
}
New-MgIdentityConditionalAccessPolicy -BodyParameter $policy | Select-Object Id, DisplayName, State
```
Stronger: `grantControls = @{ operator = 'OR'; authenticationStrength = @{ id = '00000000-0000-0000-0000-000000000004' } }`
(built-in "Phishing-resistant MFA": FIDO2 / security keys, Windows Hello).

### Check, then enable
```powershell
Install-Module Microsoft.Graph.Reports -Scope CurrentUser                  # once
Connect-MgGraph -Scopes Policy.Read.All, AuditLog.Read.All
$policyId = '<policy Id from the output above>'
(Get-MgIdentityConditionalAccessPolicy -ConditionalAccessPolicyId $policyId).Conditions.Users | Format-List IncludeUsers, ExcludeUsers
Get-MgAuditLogSignIn -Filter "appId eq '$appId'" -Top 5 |
  Select-Object CreatedDateTime, UserPrincipalName,
    @{n='CA';e={ ($_.AppliedConditionalAccessPolicies | ? Id -eq $policyId).Result }}
Update-MgIdentityConditionalAccessPolicy -ConditionalAccessPolicyId $policyId -State enabled
```
Sign-in logs appear with a delay of a few minutes. Before enabling expect `reportOnlySuccess` /
`reportOnlyInterrupted`, afterwards `success`. Sign-ins from before the policy existed show no result.
