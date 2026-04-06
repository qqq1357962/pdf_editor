#!/bin/bash

# PDF Editor 启动脚本
# 双击运行此文件即可启动服务并打开浏览器

cd "$(dirname "$0")"

# 检查是否有 vite 进程在运行
VITE_RUNNING=$(pgrep -f "vite.*pdf_editor" | head -1)

if [ -n "$VITE_RUNNING" ]; then
    echo "✅ 服务已在运行中 (PID: $VITE_RUNNING)"
else
    echo "🚀 启动 PDF Editor 服务..."
    # 在后台启动 vite
    npm run dev > /tmp/pdf-editor.log 2>&1 &
    sleep 3
    echo "✅ 服务已启动"
fi

# 等待服务完全启动并获取端口
sleep 1

# 尝试常见的端口
for PORT in 5173 5174 5175 5176; do
    if curl -s "http://localhost:$PORT" > /dev/null 2>&1; then
        echo "🌐 打开浏览器: http://localhost:$PORT"
        open "http://localhost:$PORT"
        exit 0
    fi
done

# 如果没找到运行的端口，最后再等一下尝试默认端口
sleep 2
open "http://localhost:5173"

echo ""
echo "💡 提示：关闭此终端窗口不会停止服务"
echo "   如需停止服务，运行: pkill -f 'vite.*pdf_editor'"