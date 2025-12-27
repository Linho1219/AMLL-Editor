export function isInputEl(el: HTMLElement): boolean {
  return el.closest('input[type="text"], textarea, [contenteditable="true"]') !== null
}
