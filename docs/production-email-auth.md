# Production email authentication

Mindspan's email links must use token-hash verification so they work in a
different browser or on a different device from the one that requested the
email. Do not use Supabase's default `{{ .ConfirmationURL }}` template for
these flows; it depends on the requesting browser's PKCE verifier cookie.

## Hosted Supabase templates

In **Authentication > Email Templates**, copy the complete contents of these
tracked files into the matching hosted templates:

| Supabase template | Repository source |
| --- | --- |
| Confirm signup | `supabase/templates/confirmation.html` |
| Reset password | `supabase/templates/recovery.html` |
| Magic link | `supabase/templates/magic-link.html` |
| Invite user | `supabase/templates/invite.html` |

The templates deliberately append `token_hash` and `type` to `.RedirectTo`.
Every application-generated redirect includes a `flow` query parameter, so
the appended parameters always begin with `&` and retain any Mindspan invite
or post-authentication destination.

## Release order

1. Deploy the application release containing the token-hash callback.
2. Update all four hosted email templates from the tracked files above.
3. Request a fresh email and open it in a private window or another browser.
4. Confirm signup/onboarding, password recovery, and magic-link sign-in.

Previously clicked or expired links cannot be repaired. For a failed initial
signup, delete the incomplete Auth user (if Supabase will not resend a fresh
confirmation), then create the account again after both deployment steps are
complete.
