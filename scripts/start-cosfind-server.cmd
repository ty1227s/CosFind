@echo off
cd /d "C:\Users\yuuki\OneDrive\デスクトップ\codexアプリ開発\cosfind"
"C:\Users\yuuki\.local\nodejs22\node.exe" "node_modules\next\dist\bin\next" dev --webpack -H 127.0.0.1 -p 3000 >> ".cosfind-server.log" 2>&1
