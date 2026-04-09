#!/bin/bash

# PDF Editor 一键打包脚本
# 双击运行此文件即可打包成 macOS 应用

cd "$(dirname "$0")"

echo "📦 PDF Editor 打包脚本"
echo ""

# 检查 Rust 是否安装
if ! command -v rustc &> /dev/null; then
    echo "❌ 未检测到 Rust 环境"
    echo ""
    echo "请先安装 Rust:"
    echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    echo ""
    echo "安装完成后，运行此脚本重试"
    exit 1
fi

echo "✅ Rust 已安装: $(rustc --version)"
echo ""

# 检查 Node.js 依赖
if [ ! -d "node_modules" ]; then
    echo "📥 安装 Node.js 依赖..."
    npm install
fi

echo "🚀 开始打包..."
echo "   这可能需要几分钟时间，请耐心等待..."
echo ""

# 运行 Tauri 打包
npm run tauri build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 打包完成!"
    echo ""
    echo "📦 打包结果位置:"
    echo "   src-tauri/target/release/bundle/"
    echo ""

    # 打开打包结果目录
    if [ -d "src-tauri/target/release/bundle/macos" ]; then
        echo "🎉 打开应用目录..."
        open "src-tauri/target/release/bundle/macos"
    fi
else
    echo ""
    echo "❌ 打包失败，请检查错误信息"
fi