# 摸鱼浏览器 (Mini Browser)

一个基于Electron的简易浏览器应用，专注于文本内容的浏览。

## 主要功能
- 轻量级浏览器界面
- 专注于文本内容的浏览体验
- 支持macOS、Windows和Linux平台

## 本地运行

1. 确保已安装Node.js (建议版本16+)
2. 克隆本仓库
3. 安装依赖：
```bash
npm install
```
4. 启动应用：
```bash
npm start
```

## 本地打包

### macOS
```bash
npm run build:mac  # 仅ARM64架构
npm run build:mac-universal  # 通用二进制(ARM64+x64)
```

### Windows
```bash
npm run build:win
```

### Linux
```bash
npm run build:linux
```

打包后的安装文件会生成在`dist`目录中。

## 项目结构
```
.
├── assets/          # 资源文件
│   └── icons/       # 应用图标
├── src/             # 源代码
│   ├── index.html   # 主界面
│   └── main.js      # 主进程代码
├── package.json     # 项目配置
└── README.md        # 项目说明
```

## 依赖
- Electron ^28.0.0
- electron-builder ^24.11.0

## 许可证
ISC License - 详见[LICENSE.md](LICENSE.md)