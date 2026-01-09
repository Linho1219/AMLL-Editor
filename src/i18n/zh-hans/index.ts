import type { BaseTranslation } from '../i18n-types'

const consoleArt = `
╭──────────╮       ╶╴    ┌─╴  ╶─┐┌─┐    ┌─┐      ┌─────┐    ┌─┐┌─┐
│ ━━━━━━   │      ╱  ╲   │  ╲╱  ││ │    │ │      │ ┌───┘    │ │└─┘┌─┐
│   ━━━━━  │     ╱ ╱╲ ╲  │ ╷  ╷ ││ │    │ │      │ └──┐ ╭───┘ │┌─┐│ └┐╭─────╮╭───┐
│ :"",> ━━━ • │    ╱ ╶──╴ ╲ │ │╲╱│ ││ │    │ │      │ ┌──┘ │ ╭─╮ ││ ││ ┌┘│ ╭─╮ ││ ┌─┘
│   ━━━━━  │   ╱ ╱    ╲ ╲│ │  │ ││ └───┐│ └───┐  │ └───┐│ ╰─╯ ││ ││ └┐│ ╰─╯ ││ │
╰──────────╯   ─╴      ╶─└─┘  └─┘└─────┘└─────┘  └─────┘╰─────┘└─┘╰──┘╰─────╯└─┘

喜欢您来！

项目地址: https://github.com/Linho1219/AMLL-Editor
　　　　  以 AGPLv3 only 许可证开源

友情链接: AMLL Homepage  https://amll.dev/
　　　　  AMLL TTML DB   https://db.amll.dev/
　　　　  AMLL TTML Tool https://tool.amll.dev/

另请注意: DevTools、插件、用户脚本均可能对性能有显著负面影响。
`.trim()

const zhHans = {
  editor: {
    context: {
      blank: {
        insertLine: '插入行',
      },
      betweenLines: {
        insertLine: '在此插入行',
      },
      line: {
        toggleDuet: '设置对唱',
        toggleBackground: '设置背景',
        insertLineAbove: '在前插入行',
        insertLineBelow: '在后插入行',
        duplicateLine: '克隆行',
        deleteLine: '删除行',
      },
      syllable: {
        insertSylBefore: '在前插入音节',
        insertSylAfter: '在后插入音节',
        breakLineAtSyl: '在此拆分行',
        deleteSyl: '删除音节',
      },
    },
    dragGhost: {
      copyLine: '{{ 复制行 }}', // Reserved for languages with plural
      moveLine: '{{ 移动行 }}', // Reserved for languages with plural
      copySyllable: '{{ 复制音节 }}', // Reserved for languages with plural
      moveSyllable: '{{ 移动音节 }}', // Reserved for languages with plural
    },
    emptyTip: {
      title: { noLines: '没有歌词行', allLinesEmpty: '所有歌词行均为空' },
      detail: {
        goLoadOrCreate: '使用「打开」菜单加载内容，或右键空白处插入新行',
        goLoadOrEdit: '使用「打开」菜单加载内容，或在内容视图下编辑',
      },
    },
    line: {
      index: '行序号',
      indexDbClickToToogleIgnore: '双击以切换时轴忽略状态',
      bookmark: '书签',
      duet: '对唱',
      background: '背景',
      applyRomanToSyl: '应用至逐字音译',
      generateRomanFromSyl: '从逐字音译生成',
      startTime: '行起始时间',
      endTime: '行结束时间',
      continueToNextLine: '连缀结束时间至下一行',
      addSyllable: '添加音节',
      fields: {
        trans: '行翻译',
        roman: '行音译',
      },
    },
    syllable: {
      startTime: '音节起始时间',
      endTime: '音节结束时间',
    },
    preview: {
      reloadAmll: '重载 AMLL',
    },
  },
  titlebar: {
    open: '打开',
    openTip: '打开文件',
    openMenu: {
      project: '现有工程',
      ttml: 'TTML 文件',
      pasteTTML: '粘贴 TTML',
      importFromText: '导入纯文本',
      importFromOtherFormats: '导入其他格式',
      blank: '空项目',
    },
    save: '保存',
    saveTip: '保存文件',
    saveMenu: {
      saveAs: '另存为',
      exportToProject: '导出为项目文件',
      exportToTTML: '导出为 TTML 文件',
      copyTTML: '复制 TTML',
      exportToOtherFormats: '导出其他格式',
    },
    preferences: '偏好设置',
    undo: '撤销',
    redo: '重做',
    view: {
      content: '内容',
      timing: '时轴',
      preview: '预览',
    },
    saveStatus: {
      compatMode: '兼容读写模式',
      permissionNotGranted: '未授予写入权限',
      savedAt: '已保存于 {0:Date:"",time}',
    },
  },
  ribbon: {
    content: {
      groupLabel: '内容',
      batchSyllabify: '批量断字',
      batchSyllabifyDesc: '打开批量断字侧边栏，将多行歌词文本拆分为音节。',
      metadata: '元数据',
      metadataDesc: '打开元数据侧边栏，编辑歌词文件元数据。',
      findReplace: '查找替换',
      findReplaceDesc: '打开查找替换对话框，在歌词中查找或替换文本。',
    },
    lineAttr: {
      groupLabel: '行属性',
      duet: '对唱行',
      background: '背景行',
      ignoreInTiming: '时轴中忽略',
      alwaysIgnoreBackground: '始终忽略背景行',
      startTime: '开始时间',
      endTime: '结束时间',
      duration: '持续时长',
    },
    syllableAttr: {
      groupLabel: '音节属性',
      startTime: '开始时间',
      endTime: '结束时间',
      duration: '持续时长',
      placeholdingBeat: '占位拍',
      applyToAllSameSyls: '应用到所有相同音节',
    },
    timeShift: {
      groupLabel: '时移',
      delayTest: '延迟测试',
      delay: '延迟',
      batchTimeShift: '批量时移',
      batchTimeShiftDesc: '打开批量时移对话框，调整多个音节或行的时间戳。',
    },
    view: {
      groupLabel: '视图',
      enableSylRoman: '启用逐字音译',
      scrollWithPlayback: '随播放自动滚动',
      swapTranslateRoman: '交换翻译音译框',
    },
    mark: {
      groupLabel: '标记',
      addBookmark: '添加书签',
      removeBookmark: '移除书签',
      bookmarkDesc:
        '在选定行或音节上添加或移除书签。书签可以用于标记重要的部分，且不会导出到歌词文件中。',
      addComment: '添加批注',
      removeAll: '移除全部',
      removeAllDesc: '移除全文所有行和音节的书签与批注。您可以稍后撤销。',
    },
    performance: {
      groupLabel: '性能',
      usedHeapSize: '已使用',
      totalHeapSize: '已分配',
      frameRate: '帧速率',
    },
  },
  sidebar: {
    syllabify: {
      header: '批量断字',
      enginePlaceholder: '选择断字引擎',
      engine: '断字引擎',
      recommended: '推荐',
      notRecommended: '不推荐',
      expandDesc: '展开',
      collapseDesc: '收起',
      customRules: '自定义规则',
      caseSensitive: '区分大小写',
      originalTextPlaceholder: '原始文本',
      addRule: '添加规则',
      sylDataLossWarn: '现有音节属性将丢失，时长按实义字符线性插值',
      applyToSelectedLines: '应用到选定行',
      applyToLinesAndAfter: '应用到选定行及之后',
      applyToAll: '应用到所有行',
    },
    metadata: {
      header: '元数据',
      templatePlaceholder: '不使用模板',
      templateLabel: '元数据字段模板',
      templates: {
        lrc: {
          label: 'LRC 元数据模板',
          ti: '标题',
          ar: '艺术家',
          al: '专辑',
          au: '作者',
          lr: '作词',
          by: '歌词创建者',
          re: '歌词创建工具',
          len: '音频长度',
          lenValidationMsg: '长度格式应为 mm:ss 或 mm:ss.sss',
        },
        amll: {
          label: 'AMLL TTML 元数据模板',
          musicName: '歌曲名称',
          artists: '艺术家',
          album: '专辑名',
          ncmMusicId: '网易云音乐 ID',
          qqMusicId: 'QQ 音乐 ID',
          spotifyId: 'Spotify 音乐 ID',
          appleMusicId: 'Apple Music 音乐 ID',
          isrc: 'ISRC 号',
          ttmlAuthorGithub: 'TTML 作者 GitHub UID',
          ttmlAuthorGithubLogin: 'TTML 作者 GitHub 用户名',
        },
      },
      documentBtn: '文档',
      addAllPresets: '添加全部预设',
      keyPlaceholder: '键名',
      clear: '清除',
      addField: '添加字段',
    },
    preference: {
      header: '偏好设置',
      resetConfirm: {
        header: '重置全部选项',
        message: '确定要将所有选项恢复为默认值吗？此操作不可撤销。',
        action: '重置',
      },
      groups: {
        data: '数据',
        key: '按键',
        content: '内容',
        timing: '时轴',
        spectrogram: '频谱图',
        compatibility: '兼容性',
        reset: '重置',
        about: '关于',
      },
      experimentalWarning:'实验性选项，可能不稳定',
      items: {
        autoSaveEnabled: '自动保存',
        autoSaveEnabledDesc: '授予写入权限后，定时保存至文件系统',
        autoSaveIntervalMinutes: '自动保存间隔',
        autoSaveIntervalMinutesDesc: '自动保存触发的时间间隔 (分钟)',
        maxUndoSteps: '历史记录快照数',
        maxUndoStepsDesc: '允许撤销的最大操作步数',
        packAudioToProject: '将音频嵌入项目文件',
        packAudioToProjectDesc: '将音频文件打包在项目文件中，以便归档或分享',
        ttmlAsDefault: '以 TTML 为默认格式',
        ttmlAsDefaultDesc: '新建和保存文档时默认使用 TTML 而非 ALP 格式',
        keyBinding: '按键绑定',
        keyBindingDesc: '打开快捷键设置窗口',
        keyBindingAction: '设置',
        macStyleShortcuts: 'macOS 风格组合键',
        macStyleShortcutsDesc: '使用 ⌘、⌥ 等符号展示组合键',
        audioSeekingStepMs: '音频按键跳转步长',
        audioSeekingStepMsDesc: '按键快进或快退时跳转的时长 (毫秒)',
        swapTranslateRoman: '交换翻译与音译框位置',
        swapTranslateRomanDesc: '在内容视图将音译框置于左侧，并影响查找顺序',
        sylRomanEnabled: '启用逐字音译',
        sylRomanEnabledDesc: '在音节框下方显示逐字音译，并支持查找替换',
        globalLatencyMs: '全局延时补偿',
        globalLatencyMsDesc: '正值表示实际音频落后 (毫秒)',
        alwaysIgnoreBackground: '始终忽略背景行',
        alwaysIgnoreBackgroundDesc: '在时轴页上始终跳过背景行',
        hideLineTiming: '隐藏行时间戳',
        hideLineTimingDesc: '自动从音节生成行时间戳',
        autoConnectLineTimes: '自动连接行时间',
        autoConnectLineTimesDesc: '自动连接间隔较近的相邻行时间戳',
        autoConnectThresholdMs: '行时间自动连接阈值',
        autoConnectThresholdMsDesc: '连接相邻行时允许的最大间隔 (毫秒)',
        scrollWithPlayback: '随播放自动滚动',
        scrollWithPlaybackDesc: '时轴视图中随播放进度自动滚动',
        compatibilityReport: '兼容性报告',
        compatibilityReportDesc: '打开兼容性报告窗口',
        compatibilityReportAction: '打开',
        notifyCompatIssuesOnStartup: '启动时报告兼容性问题',
        notifyCompatIssuesOnStartupDesc: '在启动时若发现问题，显示兼容性报告对话框',
        resetAll: '重置全部选项',
        resetAllDesc: '将所有选项恢复为默认值',
        resetAllAction: '重置',
        aboutApp: '关于 {0}',
        aboutAppDesc: '打开软件版本信息窗口',
        aboutAppAction: '关于',
        githubRepo: 'GitHub 仓库',
        githubRepoDesc: '访问源代码仓库页面',
        githubRepoAction: '前往',
        sidebarWidth: '侧边栏宽度',
        sidebarWidthDesc: '侧边栏的默认宽度 (像素)',
      },
    },
  },
  player: {
    chooseAudioFile: '选择音频文件',
    playOptions: '播放选项',
    volume: '音量',
    rate: '速率',
    resetTo: '重置到 {0}',
    play: '播放',
    pause: '暂停',
    showSpectrogram: '显示频谱图',
    hideSpectrogram: '隐藏频谱图',
    spectrogramUnavailable: '频谱图不可用',
    allSupportedFormats: '所有支持的音频格式',
    failedToLoadAudio: {
      summary: '加载音频失败',
      detailAborted: '文件访问被用户或平台拒绝',
    },
    loadAudioSuccess: '成功加载音频',
  },
  spectrogram: {
    emptyTip: {
      title: '没有音频数据',
      detail: '加载音频文件后将渲染频谱图',
    },
  },
  compat: {
    dialog: {
      header: '兼容性报告',
      notSupported: '不支持',
      noReasonProvided: '未提供说明',
      noImpactProvided: '未提供可能导致的问题',
      dontCheckOnStartup: '启动时不再检查兼容性',
      proceed: '确认',
    },
    sharedReasons: {
      insecureContext: '未在安全上下文中运行。需要 HTTPS 或从本地回环访问。',
    },
    clipboard: {
      name: '剪贴板 API',
      description: '剪贴板 API (Clipboard API) 允许网页在用户授权后读写系统剪贴板的内容。',
      impact: '复制和粘贴 TTML 功能不可用。',
      apiNotSupported:
        '浏览器不支持剪贴板相关的 API。此 API 在 Chromium 66、Firefox 125、Safari 13.1 或以上版本中支持。',
    },
    fileSystem: {
      name: '文件系统 API',
      description:
        '文件系统 API (File System API) 允许网页在用户授权后读写磁盘上的文件，提供接近原生的文件操作能力。',
      impact: '保存文件时无法直接写入，而是通过浏览器下载；自动保存不可用。',
      apiNotSupported:
        '浏览器不支持文件系统相关的 API。此 API 在 Chromium 86 及以上版本中支持，Firefox 和 Safari 暂不支持。',
    },
    mediaSession: {
      name: '媒体会话 API',
      description: '媒体会话 (Media Session) 允许网页自定义媒体通知和响应媒体键事件。',
      impact: '将不能从系统媒体控制界面（如锁屏界面或通知中心）控制媒体播放。',
      apiNotSupported:
        '浏览器不支持媒体会话相关的 API。此 API 在 Chromium 72、Firefox 82、Safari 15 或以上版本中支持。Firefox Android 目前不支持。',
    },
    sharedArrayBuffer: {
      name: '共享内存缓冲区',
      description: '共享内存缓冲区 (Shared Array Buffer) 允许在多个线程间高效共享数据。',
      impact: '频谱图功能不可用。',
      apiNotSupported:
        '浏览器不支持 SharedArrayBuffer。此 API 在 Chromium 68、Firefox 79、Safari 15.2 或以上版本中支持。',
      coiRequired:
        '未启用跨源隔离 (COOP/COEP)。请联系部署方提供对应的 HTTP 响应头，或调整构建选项以启用 Service Worker 方式实现的跨源隔离。',
      coiWorkaround:
        '未启用跨源隔离 (COOP/COEP)。此部署已尝试通过 Service Worker 启用跨源隔离。若未生效，请尝试刷新页面。',
    },
  },
  formats: {
    sharedReferences: {
      wikipedia: '维基百科',
      officialDoc: '官方文档',
    },
    alp: {
      name: 'AMLL Editor 工程文件',
      description: 'AMLL Editor 的项目文件格式，内嵌音频文件和歌词数据，适合项目保存和传输。',
    },
    ttml: {
      name: 'AMLL TTML',
      description: '基于 W3C TTML 标准的歌词格式，遵循 AMLL TTML 歌词格式规范。',
    },
    lrc: {
      name: '基本 LRC',
      description:
        '最常见的歌词格式。支持以行时间戳，不支持逐字时间戳。此处指基本 LRC 格式，若导入基于 LRC 的扩展格式，请选择对应扩展格式选项。',
    },
    lrcA2: {
      name: 'LRC A2 扩展',
      description: '基于 LRC 的扩展格式，支持行时间戳和逐字时间戳，最早由 A2 Media Player 提出。',
    },
    yrc: {
      name: '网易云逐字',
      description: '网易云音乐的私有逐字歌词格式。支持行时间戳和逐字时间戳。',
    },
    qrc: {
      name: 'QQ 音乐逐字',
      description: 'QQ 音乐的私有逐字歌词格式。支持行时间戳和逐字时间戳。',
    },
    spl: {
      name: '椒盐音乐逐字',
      description:
        '椒盐音乐的私有格式，基于 LRC 扩展，支持行时间戳和逐字时间戳，并支持翻译。由于规则繁杂，可能不完全可用。',
    },
  },
  file: {
    allSupportedFormats: '所有支持的格式',
    untitled: '未命名',
    loaded: '成功加载文件',
    failedToReadErr: {
      summary: '读取文件失败',
      typeNotSupported: '不支持的文件类型：{0}',
      noHandleProvided: '未提供文件句柄',
      unableToGetFile: '无法获取提供的文件',
    },
    dataDropConfirm: {
      header: '您有未保存的工作',
      message: '如果继续，所有未保存的更改将会丢失。此操作不可撤销。',
      acceptLabel: '继续',
    },
    loadFileSuccess: '成功加载文件',
    failedToLoadErr: {
      summary: '加载文件失败',
      detailAborted: '文件访问被用户或平台拒绝',
    },
    clipboardIsEmptyErr: '剪贴板为空',
    failedToPasteTTML: '从剪贴板导入 TTML 失败',
    failedToCopyTTML: '复制 TTML 到剪贴板失败',
    pasteTTMLSuccess: '成功从剪贴板导入 TTML',
    copyTTMLSuccess: '成功复制 TTML 到剪贴板',
    newBlankProjectSuccess: '成功创建空项目',
    failedBlankProject: {
      summary: '创建空项目失败',
      detailAborted: '操作被用户拒绝',
    },
    saveFileSuccess: '成功保存文件',
    failedToSaveErr: {
      summary: '保存文件失败',
      detailAborted: '文件写入被用户或平台拒绝',
    },
    saveAsSuccess: '成功另存为文件',
    failedToSaveAsErr: {
      summary: '另存为文件失败',
      detailAborted: '文件写入被用户或平台拒绝',
    },
  },
  find: {
    header: '查找替换',
    mode: {
      find: '查找',
      replace: '替换',
    },
    placeholder: {
      find: '查找内容',
      replace: '替换为',
    },
    moreOptionSwitch: '更多选项',
    optionsHeader: '匹配选项',
    options: {
      caseSensitive: '区分大小写',
      wholeWord: '全字匹配',
      wholeField: '全字段匹配',
      crossSyl: '跨音节匹配',
      useRegex: '使用正则',
      loopSearch: '循环搜索',
    },
    scopeHeader: '匹配范围',
    scope: {
      sylContent: '音节内容',
      sylRoman: '音节音译',
      trans: '翻译',
      roman: '音译',
      lineRoman: '行音译',
    },
    actions: {
      replace: '替换',
      replaceAll: '全部替换',
      findPrev: '查找上一项',
      findNext: '查找下一项',
    },
    infLoopErr: {
      summary: '搜索失败',
      detail: '发生死循环。请前往反馈此问题。',
    },
    noResultWarn: {
      summary: '找不到结果',
      detailEmpty: '在所选范围内文档为空。',
      detailNoMatch: '全文搜索完毕，未找到匹配项。',
      detailNoMatchEnd: '已到达文档末端，无匹配项。\n启用循环搜索可从头开始继续搜索。',
    },
    replaceSuccess: {
      summary: '替换成功',
      detail: '共替换了 {0:number} 处匹配项。',
    },
  },
  hotkey: {
    dialogHeader: '按键绑定',
    notBinded: '未绑定',
    btns: {
      add: '添加',
      del: '移除',
      reset: '重置为默认',
    },
    groupTitles: {
      file: '文件操作',
      view: '视图与界面',
      editing: '编辑操作',
      timing: '时轴',
      audio: '音频控制',
    },
    commands: {
      open: '打开',
      save: '保存',
      saveAs: '另存为',

      new: '新建空项目',
      exportToClipboard: '导出到剪贴板',
      importFromClipboard: '从剪贴板导入',

      switchToContent: '切换到内容视图',
      switchToTiming: '切换到时轴视图',
      switchToPreview: '切换到预览视图',

      preferences: '偏好设置',
      batchSplitText: '批量断字',
      metadata: '元数据',

      batchTimeShift: '批量时移',
      undo: '撤销',
      redo: '重做',
      bookmark: '书签',
      find: '查找',
      replace: '替换',
      delete: '删除',
      selectAllLines: '全选所有行',
      selectAllSyls: '全选所有音节',
      breakLine: '拆分行',
      duet: '设为对唱行',
      background: '设为背景行',

      goPrevLine: '上一行',
      goPrevSyl: '上一音节',
      goPrevSylnPlay: '上一音节并播放',
      goNextLine: '下一行',
      goNextSyl: '下一音节',
      goNextSylnPlay: '下一音节并播放',
      playCurrSyl: '播放当前音节',
      markBegin: '标记开始时间',
      markEndBegin: '标记连缀时间',
      markEnd: '标记结束时间',

      chooseMedia: '选择媒体',
      seekBackward: '快退',
      volumeUp: '增大音量',
      playPauseAudio: '播放/暂停音频',
      seekForward: '快进',
      volumeDown: '减小音量',
    },
    keyNames: {
      space: '空格',
    },
  },
  syllabify: {
    engines: {
      basic: {
        name: '基本断字',
        description:
          '对西文按词拆分，对于 CJK 按字拆分。若有自定义规则，将对拆分后的词应用，已拆分的词不会合并。',
      },
      jaBasic: {
        name: '日语基本断字',
        description:
          '针对日语拗音等做专门处理。若有自定义规则，将优先提取自定义拆分，其余部分按规则拆分。',
      },
      prosodic: {
        name: 'Prosodic 英语断字',
        description:
          '将 SUBTLEXus 作为语料，由 Prosodic 根据 CMUDict 进行音节划分后，匹配回拼写得到词典，高频词经人工校对。未命中的词将回退至 Compromise。',
      },
      silabeador: {
        name: 'Silabeador 西班牙语断字',
        description:
          '由 Silabeador 库提供的正字法西班牙语音节划分，内置例外表。同时可容忍不常见或非西班牙语变音符号与辅音集群。',
      },
      compromise: {
        name: 'Compromise 英语断字',
        description: '由 Compromise 库提供的正字法英语音节拆分。',
      },
      syllabifyFr: {
        name: 'Syllabify-fr 法语断字',
        description: '由 Syllabify-fr 库提供的正字法法语语音节划分。',
      },
      syllabify: {
        name: 'Syllabify 俄语断字',
        description: '由 Syllabify 库提供的正字法俄语音节划分。',
      },
    },
  },
  components: {
    confirmDialog: {
      cancel: '取消',
      continue: '继续',
    },
    emptyTipDefault: '当前视图无内容可显示',
  },
  importFromText: {
    header: '从纯文本导入',
    modes: {
      separate: '分别输入',
      separateDesc: '歌词原文、翻译、音译分别在不同的文本框中输入。相同位置的行为一组。',
      interleaved: '交错行',
      interleavedDesc: '歌词原文与翻译、音译行混合交错排列。每连续的数行为一组。',
    },
    fields: {
      original: '原文',
      keepCurrentLinesTip: '（保留现有行）',
      trans: '翻译',
      roman: '音译',
      atLeastProvideOne: '至少提供一项',
    },
    toolBtns: {
      removeTimestamps: '移除时间戳',
      normalizeSpaces: '规范化空格',
      capitalizeFirstLetter: '首字母大写',
      removeTrailingPunc: '去除尾标点',
    },
    lineOrder: {
      header: '行顺序设置',
      cycleLengthHint: '当前循环节共 {0:number} 行',
      original: '原文行',
      trans: '翻译行',
      roman: '音译行',
      emptyLineCount: '组间空行数',
    },
    cancel: '取消',
    action: '导入',
  },
  importFromOtherFormats: {
    header: '从其他歌词格式导入',
    noDescriptionProvided: '未提供说明',
    showExamples: '显示示例',
    fromFile: '从文件打开',
    exampleLabel: '示例格式',
    cancel: '取消',
    import: '导入',
    requireSelectFormat: '请在左侧选择格式',
  },
  about: {
    header: '关于',
    version: '版本',
    description:
      '基于 Vue 的开源逐音节歌词编辑器，可与 AMLL 生态软件协作，目标成为 AMLL TTML Tool 的继任者。\n开发不易，不妨点个免费的 star 吧！',
    githubBtn: 'GitHub 仓库',
    detailBtn: '展开详细信息',
    detail: {
      version: '版本号',
      channel: '构建通道',
      hash: '提交哈希',
      buildTime: '构建时间',
      amllCoreVersion: 'AMLL 核心版本',
      amllVueVersion: 'AMLL Vue 版本',
      notSpecified: '未指定',
    },
  },
  batchTimeShift: {
    header: '批量时移',
    signHint: '推迟为正，提前为负',
    applyToSyl: '应用到选定音节',
    applyToLine: '应用到选定行',
    applyToAll: '应用到全文',
  },
  consoleArt,
} satisfies BaseTranslation

export default zhHans
