# PDF页面操作功能设计文档

> 面向科研论文写作的PDF编辑功能，支持从PDF中提取页面作为Overleaf配图

## 目标用户场景

科研人员在撰写论文时，需要从PDF中提取特定页面作为Overleaf配图：
- 打开一个PDF，裁剪需要的页面区域
- 删除不需要的页面
- 导出处理后的PDF或图片

## 核心功能

| 优先级 | 功能 | 说明 |
|--------|------|------|
| 必须 | 删除页面 | 标记删除，不显示/不导出 |
| 必须 | 裁剪页面 | 手动框选 + 自动识别边界 |
| 必须 | 导出PDF | 导出处理后的PDF文件 |
| 必须 | 导出图片 | 导出PNG/JPG格式 |
| 可选 | 旋转页面 | 0/90/180/270度旋转 |
| 可选 | 复制粘贴 | Ctrl+C/V 复制页面 |

---

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│  Toolbar (顶部)                                      │
│  [Open PDF] [*文件名] [应用] | [导出PDF] [导出图片]   │
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│  Sidebar     │     PDFViewer (主预览区)              │
│  (缩略图)    │                                       │
│              │     ┌─────────────────┐               │
│  [页1 缩略]  │     │                 │               │
│  [页2 缩略]  │     │   当前页面      │    裁剪框    │
│  [页3 缩略]  │     │   大图显示      │    叠加层    │
│   ...        │     │                 │               │
│              │     └─────────────────┘               │
│              │                                       │
│  [裁剪][自动]│                                       │
│  [旋转][删除]│                                       │
│              │                                       │
└──────────────┴──────────────────────────────────────┘
```

**核心组件：**
- `Sidebar` - 缩略图列表，显示删除标记
- `PDFViewer` - 主预览区，叠加裁剪框Canvas层
- `CropOverlay` - 裁剪框交互层
- `Toolbar` - 扩展导出按钮
- `ExportDialog` - 导出配置弹窗

---

## 数据结构

### PageState

```typescript
interface PageState {
  sourcePageIndex: number;       // 指向源PDF的页码（从0开始）
  rotation: 0 | 90 | 180 | 270;  // 旋转角度
  cropBox: CropBox | null;       // 裁剪区域
  deleted: boolean;              // 是否删除
}

interface CropBox {
  x1: number;  // 左下角 x (%)，左下角为原点
  y1: number;  // 左下角 y (%)
  x2: number;  // 右上角 x (%)
  y2: number;  // 右上角 y (%)
}
```

### 编辑器状态

```typescript
interface EditorState {
  pages: PageState[];            // 页面状态列表
  selectedIndex: number;         // 当前选中页索引
  hasUnappliedChanges: boolean;  // 是否有待应用更改
  mode: 'view' | 'crop';         // 当前模式
}
```

**示例：**

打开5页PDF后：
```
pages = [
  { sourcePageIndex: 0, rotation: 0, cropBox: null, deleted: false },
  { sourcePageIndex: 1, rotation: 90, cropBox: {x1:10,y1:20,x2:80,y2:90}, deleted: false },
  { sourcePageIndex: 2, rotation: 0, cropBox: null, deleted: true },
  { sourcePageIndex: 3, rotation: 0, cropBox: null, deleted: false },
  { sourcePageIndex: 4, rotation: 180, cropBox: null, deleted: false },
]
```

复制页面2后（sourcePageIndex仍指向原始页1）：
```
pages = [
  { sourcePageIndex: 0, ... },
  { sourcePageIndex: 1, rotation: 90, cropBox: {...}, deleted: false },
  { sourcePageIndex: 1, rotation: 90, cropBox: {...}, deleted: false }, // 复制页
  { sourcePageIndex: 2, ... },
  ...
]
```

---

## 状态机制

### 待应用/已应用状态

```
┌──────────┐    编辑操作     ┌──────────┐
│  已应用   │ ─────────────→ │  待应用   │
│  (干净)   │                │  (有*号)  │
└──────────┘ ←───────────── └──────────┘
              点击"应用"
```

- 文件名旁显示 `*` 星号表示有待应用更改
- 点击"应用"按钮 → 修改原PDF文件 → 清空状态 → 星号消失
- 无更改时点击"应用"被忽略

### 撤销机制

**待应用状态内：**
- Ctrl+Z 撤销上一步操作
- Ctrl+Y 重做
- 使用状态快照栈实现

```typescript
const historyStack: PageState[][] = [];  // 编辑前保存
const futureStack: PageState[][] = [];   // 撤销后保存
```

**已应用后：**
- 历史版本缓存（最多30MB）
- GUI界面选择恢复
- 启动/退出时清理缓存

---

## 功能详细设计

### 1. 删除页面

**交互流程：**
1. 选中某页缩略图
2. 点击"删除"按钮 或 按Delete键
3. 该页标记 `deleted: true`
4. 缩略图显示灰色遮罩
5. 预览自动跳转到下一可用页

**渲染时：** 跳过 `deleted: true` 的页面

### 2. 旋转页面

**交互流程：**
1. 选中某页
2. 点击"旋转"按钮
3. 页面旋转90° → `rotation` 更新
4. 缩略图同步更新显示

**渲染时：** 根据 `rotation` 值旋转Canvas

### 3. 裁剪页面

**交互流程：**
1. 选中某页 → 点击"裁剪"按钮 → 进入裁剪模式
2. 页面叠加裁剪框Canvas层
3. 用户拖拽调整裁剪框边界
4. 显示坐标：(x=10%, y=20%) → (x=80%, y=90%)，左下角为原点
5. 点击"自动"按钮 → 自动收缩到非空白边界（保留3%边距）
6. 点击"确认" → 保存 cropBox
7. 点击"取消" → 清除裁剪框

**裁剪框视觉：**
- 内部区域清晰显示
- 外部区域深色半透明遮罩
- 四角可拖拽调整

### 4. 自动裁剪算法

```
1. 渲染当前页到离屏Canvas
2. 获取像素数据 getImageData()
3. 从四个方向扫描边界：
   - 从上往下扫 → y_top
   - 从下往上扫 → y_bottom
   - 从左往右扫 → x_left
   - 从右往左扫 → x_right
4. 添加 3% 边距
5. 更新 cropBox
```

**白色像素判断：**
```typescript
const threshold = config.crop.whitePixelThreshold; // 250
return r > threshold && g > threshold && b > threshold;
```

### 5. 复制粘贴页面

**剪贴板状态：**
```typescript
let clipboard: {
  sourcePageIndex: number;
  rotation: 0 | 90 | 180 | 270;
  cropBox: CropBox | null;
} | null = null;
```

**交互：**
- Ctrl+C / 右键复制 → 复制选中页状态到剪贴板
- Ctrl+V / 右键粘贴 → 插入新PageState到选中页之后

### 6. 导出PDF

**使用 pdf-lib 库：**
1. 创建新 PDFDocument
2. 遍历 pages（跳过 deleted）
3. 对每个 page：
   - 从源PDF复制页面 sourcePageIndex
   - 应用 rotation
   - 应用 cropBox（设置 MediaBox）
4. 保存为新文件

**导出对话框：**
- 文件名输入
- 页面范围：全部 / 仅选中

### 7. 导出图片

**使用当前Canvas：**
1. 获取 PDFViewer 的 canvas
2. 如有 cropBox → 裁剪canvas区域
3. canvas.toBlob()
4. 下载文件

**导出对话框：**
- 格式：PNG / JPG
- 分辨率：1x / 2x / 3x

---

## 配置文件

`src/config/pdf-editor.config.ts`：

```typescript
export const config = {
  crop: {
    autoCropMargin: 0.03,        // 自动裁剪边距
    whitePixelThreshold: 250,    // 白色像素阈值
    minCropSize: 0.05,           // 最小裁剪框
  },
  history: {
    maxCacheSizeMB: 30,          // 历史版本最大缓存
  },
  thumbnail: {
    width: 120,                  // 缩略图宽度
    quality: 0.8,                // 渲染质量
  },
  export: {
    defaultImageFormat: 'png',
    imageResolutions: [1, 2, 3],
  },
  shortcuts: {
    copy: 'Ctrl+C',
    paste: 'Ctrl+V',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
    delete: 'Delete',
  },
};
```

---

## 技术栈

| 功能 | 库 |
|------|-----|
| PDF渲染 | pdfjs-dist (已安装) |
| PDF操作/导出 | pdf-lib (需安装) |
| 文件保存 | file-saver (需安装) |
| 状态管理 | React useState/useReducer |

---

## 文件结构

```
src/
├── config/
│   └── pdf-editor.config.ts    # 配置文件
├── components/
│   ├── Sidebar/
│   │   ├── Sidebar.tsx         # 侧边栏容器
│   │   └── Thumbnail.tsx       # 缩略图卡片
│   ├── PDFViewer.tsx           # 主预览（已有，需扩展）
│   ├── CropOverlay.tsx         # 裁剪框层
│   ├── Toolbar.tsx             # 工具栏（需扩展）
│   └── ExportDialog.tsx        # 导出对话框
├── hooks/
│   ├── usePDF.ts               # PDF加载（已有，需扩展）
│   └── useEditorState.ts       # 编辑器状态管理
├── utils/
│   ├── pdf-export.ts           # PDF导出逻辑
│   ├── image-export.ts         # 图片导出逻辑
│   └── auto-crop.ts            # 自动裁剪算法
└── types/
    └── pdf.ts                  # 类型定义（需扩展）
```