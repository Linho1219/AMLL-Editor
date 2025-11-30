# Legal Notice

This project includes code that provides playback compatibility
for certain proprietary audio container formats.

### Third-Party Components

- **ncmdump** (C++ core)  
  Source: <https://github.com/taurusxin/ncmdump/>  
  License: MIT License

- **ncmdump-web** (Emscripten WebAssembly build)  
  Source: <https://github.com/AthBe1337/ncmdump-web/>  
  License: MIT License

The files `src/lib/ncm/wasm/ncmdump.js` and `src/lib/ncm/wasm/ncmdump.wasm`
are directly built from the `ncmdump-web` repository.  
Minor modifications were made only to integrate with this project's build process
and to remove or rename sensitive identifiers for clarity.

### Purpose and Scope

This project does **not** provide, promote, or enable circumvention of any
Digital Rights Management (DRM) or other access control mechanisms.  
The included components are used solely to enable interoperability and playback
of media files supplied by end users.

The project itself does **not** distribute or include any copyrighted media,
nor does it facilitate extraction, redistribution, or modification
of copyrighted works.

### DMCA Safe Harbor Statement

This project operates under the principles of the
**Safe Harbor provisions (Section 512)** of the U.S. Digital Millennium Copyright Act (DMCA).  
If you believe that any component of this repository infringes your copyright,  
please contact the maintainers via GitHub Issues or by email.  
We will review and remove the affected materials promptly if necessary.

---

_Last updated: 2025-11_
