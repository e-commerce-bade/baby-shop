// Excel ve benzerleri "=", "+", "-", "@" (ya da sekme / satir basi) ile baslayan hucreyi formul
// olarak calistirir. Musteri ya da urun adina yazilmis boyle bir deger (orn. =HYPERLINK(...))
// disa aktarilan dosya acildiginda calismasin diye basina tek tirnak eklenir; hucre metin olarak
// gorunur.
function neutralizeFormula(cell: string) {
  return /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell
}

export function toCsv(rows: string[][]) {
  return rows
    .map((row) => row.map((cell) => `"${neutralizeFormula(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n')
}

export function downloadCsv(fileName: string, rows: string[][]) {
  // Bastaki BOM, Excel'in dosyayi UTF-8 okumasini saglar (yoksa ş, ğ, İ bozuk gorunur).
  const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
