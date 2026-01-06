<img src="./icons/normal/brand.svg" width="80px" />

# AMLL Editor

![Version](https://img.shields.io/github/package-json/v/Linho1219/AMLL-Editor?label=Version&color=white)
[![Vite Version](https://img.shields.io/github/package-json/dependency-version/Linho1219/AMLL-Editor/dev/vite?label=Vite&color=646CFF&logo=vite&logoColor=white)](https://vite.dev/)
[![Vue Version](https://img.shields.io/github/package-json/dependency-version/Linho1219/AMLL-Editor/vue?label=Vue&color=4FC08D&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![PrimeVue Version](https://img.shields.io/github/package-json/dependency-version/Linho1219/AMLL-Editor/primevue?label=PrimeVue&color=41B883&logo=primevue&logoColor=white)](https://primevue.org/)
[![AMLL Core Version](https://img.shields.io/github/package-json/dependency-version/Linho1219/AMLL-Editor/%40applemusic-like-lyrics%2Fcore?label=AMLL%20Core&color=FA243C&logo=applemusic&logoColor=white)](https://amll.dev)  
[![Cloudflare Pages: STABLE](https://img.shields.io/website?url=https%3A%2F%2Feditor.amll.dev%2F&logo=cloudflare&logoColor=white&label=Pages%2fSTABLE)](https://editor.amll.dev/)
[![Cloudflare Pages: BETA](https://img.shields.io/website?url=https%3A%2F%2Fbeta-editor.amll.dev%2F&logo=cloudflare&logoColor=white&label=Pages%2fBETA)](https://beta-editor.amll.dev/)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Linho1219/AMLL-Editor)

基于 Vue 的开源逐音节歌词编辑器。  
目标成为 [AMLL TTML Tool](https://github.com/Steve-xmh/amll-ttml-tool) 的继任者，可与 [AMLL](https://github.com/Steve-xmh/applemusic-like-lyrics) 生态协作。

暂处于早期开发阶段。

访问稳定版：<https://editor.amll.dev/>  
开发分支部署：<https://beta-editor.amll.dev/>

## 部署

本项目部署在 Cloudflare Pages 上，你可以直接从上方的链接访问。

若你希望自行部署，需要注意：频谱图功能需要跨站隔离（Cross Origin Isolation, COI）。因此服务端需要在响应时添加标头：

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

本项目在构建产物中包含适用于 Cloudflare Pages 的 `_headers` 文件，用于自动配置所需的响应头。若你需要在其他平台部署（如 Vercel 等），请自行参考相应平台文档。

GitHub Pages 不支持自定义响应头，因此无法原生满足跨站隔离要求。

为此，本项目提供一个可选的兼容方案：当环境变量 `VITE_COI_WORKAROUND` 为真值时，将通过 Service Worker 模拟跨站隔离环境（解决方案来自 [gzuidhof/coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker)）。该方案存在一定限制：启用后，页面在首次加载时会触发一次额外的自动刷新，刷新后 Service Worker 才会接管并生效。相应地，兼容性检查将延迟 3 秒触发，以等待 Service Worker 完成装载。

## License

本项目以 GNU Affero General Public License v3.0 only 许可授权。

This project is licensed under the GNU Affero General Public License v3.0 only.
See [the LICENSE file](./LICENSE) for details.

SPDX-License-Identifier: AGPL-3.0-only

## Legal Notice

本项目仅提供多种音频封装格式的播放兼容能力，不包含、分发或破解任何 DRM 技术。用户自行导入的音频或歌词文件仅在本地处理，项目不附带任何版权内容。用户应自行确保其使用符合相关版权法规及内容许可条款。

This project provides playback compatibility for various audio containers, including some proprietary formats that may be used by certain music services. It **DOES NOT** remove or alter any Digital Rights Management (DRM) measures, nor does it enable extraction, redistribution, or modification of copyrighted works.

All media and lyric files processed by this software are user-supplied. The project itself **DOES NOT** include, distribute, or store any copyrighted material. Users are solely responsible for ensuring that their use of the software complies with applicable copyright laws and the terms of any relevant content licenses.
