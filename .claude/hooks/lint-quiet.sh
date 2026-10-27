#!/usr/bin/env bash
# Corre el lint de client/ y server/ tras cada edición.
# Si todo está bien no imprime nada (no gasta tokens).
# Si falla, muestra máximo 30 líneas por stderr y sale con 2
# para que Claude Code se las pase a Claude y las corrija.

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

errors=""
for dir in client server; do
  if [ -f "$dir/package.json" ]; then
    out=$(npm --prefix "$dir" run lint --if-present --silent 2>&1)
    if [ $? -ne 0 ]; then
      errors+="[$dir]"$'\n'"$out"$'\n'
    fi
  fi
done

if [ -n "$errors" ]; then
  echo "$errors" | head -n 30 >&2
  exit 2
fi

exit 0
