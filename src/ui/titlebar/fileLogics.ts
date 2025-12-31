import { type Ref, computed } from 'vue'

import { compatibilityMap } from '@core/compat'
import { portFormatRegister } from '@core/convert'
import { parseTTML, stringifyTTML } from '@core/convert/formats/ttml'
import { fileState as FS, simpleSaveTextFile } from '@core/file'
import { getHotkeyStr } from '@core/hotkey'

import { collectPersist } from '@states/services/port'
import { useRuntimeStore } from '@states/stores'

import { useToast } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'

interface TitlebarFileLogicsState {
  openWorking: Ref<boolean>
  saveWorking: Ref<boolean>
}

export function useTitlebarFileLogics({ openWorking, saveWorking }: TitlebarFileLogicsState) {
  const toast = useToast()
  const runtimeStore = useRuntimeStore()
  const successTip = (summary: string, detail?: string) => {
    toast.add({ severity: 'success', summary, detail, life: 3000 })
  }
  const errorTip = (summary: string, detail?: string) => {
    toast.add({ severity: 'error', summary, detail, life: 3000 })
  }

  const isUserAbortError = (e: unknown) => {
    const err = e as Error
    return (
      err.message.includes('The user aborted a request') ||
      err.message.includes('is not allowed by the user agent')
    )
  }

  async function __handleOpen(fsopener: () => Promise<string>) {
    if (openWorking.value) return
    openWorking.value = true
    try {
      successTip('成功装载文件', await fsopener())
    } catch (e) {
      console.error(e)
      const err = e as Error
      if (isUserAbortError(err)) errorTip('打开文件失败', '文件访问被用户或平台拒绝')
      else errorTip('打开文件失败', (e as Error).message)
    }
    openWorking.value = false
  }
  function handleOpenClick() {
    __handleOpen(FS.openFile)
  }
  function handleOpenProjClick() {
    __handleOpen(FS.openProjFile)
  }
  function handleOpenTTMLClick() {
    __handleOpen(FS.openTTMLFile)
  }

  async function handleImportFromClipboard() {
    const text = await navigator.clipboard.readText()
    if (!text) {
      errorTip('剪贴板为空')
      return
    }
    try {
      const persist = parseTTML(text)
      await FS.importPersist(persist)
      successTip('已从剪贴板导入 TTML')
    } catch (err) {
      console.error(err)
      errorTip('从剪贴板导入 TTML 失败', (err as Error).message)
    }
  }
  async function handleCreateBlankProject() {
    try {
      await FS.createBlankProject()
      successTip('已创建空项目')
    } catch (e) {
      console.error(e)
      if (isUserAbortError(e)) errorTip('创建空项目失败', '操作被用户拒绝')
      else errorTip('创建空项目失败', (e as Error).message)
    }
  }
  async function handleExportToClipboard() {
    const ttml = stringifyTTML(collectPersist())
    try {
      await navigator.clipboard.writeText(ttml)
      successTip('已复制 TTML 到剪贴板')
    } catch (err) {
      console.error(err)
      errorTip('复制 TTML 到剪贴板失败', (err as Error).message)
    }
  }

  async function handleSaveClick() {
    if (saveWorking.value) return
    saveWorking.value = true
    try {
      successTip('成功保存文件', await FS.saveFile())
    } catch (e) {
      console.error(e)
      if (isUserAbortError(e)) errorTip('保存文件失败', '文件写入被用户或平台拒绝')
      else errorTip('保存文件失败', (e as Error).message)
    }
    saveWorking.value = false
  }
  async function __handleSaveAs(savePromise: Promise<string>) {
    if (saveWorking.value) return
    saveWorking.value = true
    try {
      successTip('成功另存为文件', await savePromise)
    } catch (e) {
      console.error(e)
      if (isUserAbortError(e)) errorTip('另存为文件失败', '文件写入被用户或平台拒绝')
      else errorTip('另存为文件失败', (e as Error).message)
    }
    saveWorking.value = false
  }
  function handleSaveAsClick() {
    __handleSaveAs(FS.saveAsFile())
  }
  function handleSaveAsTTMLClick() {
    __handleSaveAs(FS.saveAsTTMLFile())
  }
  function handleSaveAsProjectClick() {
    __handleSaveAs(FS.saveAsProjectFile())
  }

  const openMenuItems = computed<MenuItem[]>(() => [
    {
      label: '现有项目',
      icon: 'pi pi-file',
      command: handleOpenProjClick,
    },
    {
      label: 'TTML 文件',
      icon: 'pi pi-file',
      command: handleOpenTTMLClick,
    },
    { separator: true },
    {
      label: '粘贴 TTML',
      icon: 'pi pi-clipboard',
      command: handleImportFromClipboard,
      disabled: !compatibilityMap.clipboard,
      tip: getHotkeyStr('importFromClipboard'),
    },
    {
      label: '导入纯文本',
      icon: 'pi pi-align-left',
      command: () => (runtimeStore.dialogShown.fromText = true),
    },
    {
      label: '导入其他格式',
      icon: 'pi pi-paperclip',
      command: () => (runtimeStore.dialogShown.fromOtherFormat = true),
    },
    { separator: true },
    {
      label: '空项目',
      icon: 'pi pi-ban',
      command: handleCreateBlankProject,
      tip: getHotkeyStr('new'),
    },
  ])

  const saveMenuNormalSaveAs = computed<MenuItem[]>(() => [
    {
      label: '另存为',
      icon: 'pi pi-file-edit',
      command: handleSaveAsClick,
      tip: getHotkeyStr('saveAs'),
    },
  ])
  const saveMenuFallbackSaveAs = computed<MenuItem[]>(() => [
    {
      label: '导出为项目文件',
      icon: 'pi pi-file-edit',
      command: handleSaveAsProjectClick,
    },
    {
      label: '导出为 TTML 文件',
      icon: 'pi pi-file-edit',
      command: handleSaveAsTTMLClick,
    },
  ])
  const saveMenuItemsWithoutSaveAs = computed<MenuItem[]>(() => [
    {
      label: '复制 TTML',
      icon: 'pi pi-clipboard',
      command: handleExportToClipboard,
      disabled: !compatibilityMap.clipboard,
      tip: getHotkeyStr('exportToClipboard'),
    },
    {
      label: '导出其他格式',
      icon: 'pi pi-file-export',
      items: portFormatRegister.map((format) => ({
        label: format.name,
        command: () => {
          const string = format.stringifier(collectPersist())
          simpleSaveTextFile(
            string,
            FS.suggestName(),
            format.accept,
            format.name,
            'export-to-other-format',
          )
        },
        tip: format.accept.join(', '),
      })),
    },
  ])
  const saveMenuItems = computed<MenuItem[]>(() => [
    ...(compatibilityMap.fileSystem ? saveMenuNormalSaveAs.value : saveMenuFallbackSaveAs.value),
    ...saveMenuItemsWithoutSaveAs.value,
  ])
  return {
    handleSaveClick,
    handleOpenClick,
    handleSaveAsClick,
    handleCreateBlankProject,
    handleExportToClipboard,
    handleImportFromClipboard,
    openMenuItems,
    saveMenuItems,
  }
}
