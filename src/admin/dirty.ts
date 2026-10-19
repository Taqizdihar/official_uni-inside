let editorDirty = false;
export function setEditorDirty(value: boolean) { editorDirty = value; }
export function confirmEditorNavigation() { return !editorDirty || window.confirm('Tinggalkan perubahan yang belum disimpan?'); }
