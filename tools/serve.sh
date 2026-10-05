#!/bin/sh
# Serve the site folder at http://localhost:8080
cd "$(dirname "$0")/../site" && python -m http.server 8080
