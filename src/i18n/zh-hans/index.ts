import type { BaseTranslation } from '../i18n-types'

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
    },
    syllable: {
      startTime: '音节起始时间',
      endTime: '音节结束时间',
    },
    preview: {
      reloadAmll: '重载 AMLL',
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
} satisfies BaseTranslation

export default zhHans
