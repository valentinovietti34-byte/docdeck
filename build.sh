#!/usr/bin/env bash
# Wraps app.html in a full HTML document so it can be hosted as a static site (index.html).
set -e
cd "$(dirname "$0")"
{ printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n'; cat app.html; printf '\n</body>\n</html>\n'; } > index.html
echo "Built index.html"
