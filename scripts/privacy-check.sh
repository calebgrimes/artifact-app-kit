#!/bin/bash
# privacy-check.sh: fail if the kit holds personal data. Run it before every commit and before you publish.
#
#   bash scripts/privacy-check.sh
#
# It checks every file git would publish (tracked and new, not ignored) for generic patterns:
# home folders other than /Users/example, real artifact links, Claude session ids, email addresses, and scheduling links.
# Private names (people, companies, projects) go in .privacy-patterns.local, one per line (case is ignored).
# That file is in .gitignore, so the names themselves never ship.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 2

FILES=()
while IFS= read -r f; do [ -f "$f" ] && FILES+=("$f"); done < <(git ls-files --cached --others --exclude-standard)
[ ${#FILES[@]} -gt 0 ] || { echo "✖ FAIL no files found (is this a git repo?)"; exit 2; }

fail=0
hit() { # $1 = label, rest = grep output
  local label="$1"; shift
  if [ -n "$*" ]; then echo "✖ FAIL $label"; echo "$*" | sed 's/^/    /' | head -20; fail=1; else echo "✔ PASS no $label"; fi
}

# shortcut: the allowlist drops a whole line, so a line with both /Users/example and a real home path passes; split such lines if it matters.
hit "home folder paths" "$(grep -nIE '/(Users|home)/[A-Za-z0-9._-]+' "${FILES[@]}" | grep -vE '/(Users|home)/(example|you|<[a-z]+>)\b' )"
hit "real artifact links" "$(grep -nIE 'claude\.ai/(code/)?artifact/[A-Za-z0-9-]{8,}' "${FILES[@]}")"
hit "Claude session ids" "$(grep -nIE 'session_[A-Za-z0-9]{12,}' "${FILES[@]}")"
hit "email addresses" "$(grep -nIE '[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z.]{2,}' "${FILES[@]}")"
hit "scheduling links" "$(grep -nIiE 'calendly\.com/|cal\.com/[a-z]' "${FILES[@]}")"

LOCAL="$ROOT/.privacy-patterns.local"
if [ -f "$LOCAL" ]; then
  n=$(grep -cvE '^[[:space:]]*(#|$)' "$LOCAL")
  echo "◐ loaded $n private names from .privacy-patterns.local"
  ALLOW="$ROOT/.privacy-allow.local"  # optional: one extended regex per line; matching hit lines are allowed (for example your name as the author)
  hits="$(grep -nIiF -f <(grep -vE '^[[:space:]]*(#|$)' "$LOCAL") "${FILES[@]}")"
  [ -f "$ALLOW" ] && [ -n "$hits" ] && hits="$(printf '%s\n' "$hits" | grep -vE -f <(grep -vE '^[[:space:]]*(#|$)' "$ALLOW"))"
  hit "private names" "$hits"
else
  echo "◆ NOTE no .privacy-patterns.local: only the generic checks ran. Add your own names there."
fi

if [ $fail -eq 0 ]; then echo "✔ privacy check passed (${#FILES[@]} files)"; else echo "✖ privacy check FAILED"; fi
exit $fail
