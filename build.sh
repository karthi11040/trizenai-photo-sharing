#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "--- Installing Node.js dependencies ---"
npm install

echo "--- Building Next.js application ---"
npm run build

echo "--- Build complete ---"
