'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

type StaffData = {
  name: string
  role: string
  shifts: Record<number, string>
}

type Props = {
  storeName: string
  year: number
  month: number
  daysInMonth: number
  staffData: StaffData[]
}

export default function ShiftPdfButton({
  storeName,
  year,
  month,
  daysInMonth,
  staffData,
}: Props) {
  const [loading, setLoading] =
    useState(false)

  function getWeek(day: number) {
    const date = new Date(
      year,
      month - 1,
      day
    )

    return [
      '日',
      '月',
      '火',
      '水',
      '木',
      '金',
      '土',
    ][date.getDay()]
  }

  async function handlePdf() {
    setLoading(true)

    try {
      // =========================
      // PDF用HTML作成
      // =========================
      const container =
        document.createElement('div')

      container.style.position =
        'fixed'

      container.style.left =
        '-10000px'

      container.style.top = '0'

      container.style.background =
        '#ffffff'

      container.style.padding =
        '30px'

      container.style.width =
        '1800px'

      container.style.fontFamily =
        'Arial, sans-serif'

      container.style.color =
        '#000000'

      // =========================
      // タイトル
      // =========================
      const title =
        document.createElement('div')

      title.style.fontSize =
        '28px'

      title.style.fontWeight =
        'bold'

      title.style.marginBottom =
        '8px'

      title.textContent =
        `${storeName} シフト表`

      container.appendChild(title)

      const subtitle =
        document.createElement('div')

      subtitle.style.fontSize =
        '20px'

      subtitle.style.marginBottom =
        '24px'

      subtitle.textContent =
        `${year}年${month}月`

      container.appendChild(
        subtitle
      )

      // =========================
      // テーブル
      // =========================
      const table =
        document.createElement(
          'table'
        )

      table.style.borderCollapse =
        'collapse'

      table.style.width = '100%'

      table.style.fontSize =
        '13px'

      // =========================
      // ヘッダー
      // =========================
      const thead =
        document.createElement(
          'thead'
        )

      const headerRow =
        document.createElement(
          'tr'
        )

      const staffHeader =
        document.createElement(
          'th'
        )

      staffHeader.textContent =
        'スタッフ'

      staffHeader.style.border =
        '1px solid #999'

      staffHeader.style.padding =
        '8px'

      staffHeader.style.minWidth =
        '130px'

      staffHeader.style.background =
        '#eeeeee'

      headerRow.appendChild(
        staffHeader
      )

      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {
        const th =
          document.createElement(
            'th'
          )

        th.style.border =
          '1px solid #999'

        th.style.padding =
          '5px'

        th.style.minWidth =
          '48px'

        th.style.background =
          '#eeeeee'

        th.style.textAlign =
          'center'

        th.innerHTML =
          `${day}<br><span style="font-size:10px;font-weight:normal;">${getWeek(
            day
          )}</span>`

        headerRow.appendChild(th)
      }

      thead.appendChild(
        headerRow
      )

      table.appendChild(thead)

      // =========================
      // 本体
      // =========================
      const tbody =
        document.createElement(
          'tbody'
        )

      staffData.forEach(
        (staff) => {
          const row =
            document.createElement(
              'tr'
            )

          // スタッフ名
          const nameCell =
            document.createElement(
              'td'
            )

          nameCell.style.border =
            '1px solid #999'

          nameCell.style.padding =
            '7px'

          nameCell.style.whiteSpace =
            'nowrap'

          nameCell.innerHTML =
            `<strong>${staff.name}</strong><br><span style="font-size:10px;">${staff.role}</span>`

          row.appendChild(
            nameCell
          )

          // 日別シフト
          for (
            let day = 1;
            day <=
            daysInMonth;
            day++
          ) {
            const cell =
              document.createElement(
                'td'
              )

            cell.style.border =
              '1px solid #999'

            cell.style.padding =
              '5px'

            cell.style.textAlign =
              'center'

            cell.style.whiteSpace =
              'nowrap'

            cell.textContent =
              staff.shifts[
                day
              ] || ''

            row.appendChild(
              cell
            )
          }

          tbody.appendChild(
            row
          )
        }
      )

      table.appendChild(tbody)

      container.appendChild(table)

      document.body.appendChild(
        container
      )

      // =========================
      // HTML → 画像
      // =========================
      const canvas =
        await html2canvas(
          container,
          {
            scale: 2,
            backgroundColor:
              '#ffffff',
            useCORS: true,
          }
        )

      document.body.removeChild(
        container
      )

      const imageData =
        canvas.toDataURL(
          'image/jpeg',
          0.95
        )

      // =========================
      // PDF作成
      // A4横
      // =========================
      const pdf = new jsPDF({
        orientation:
          'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth =
        pdf.internal.pageSize.getWidth()

      const pdfHeight =
        pdf.internal.pageSize.getHeight()

      const margin = 5

      const availableWidth =
        pdfWidth -
        margin * 2

      const availableHeight =
        pdfHeight -
        margin * 2

      const imageWidth =
        canvas.width

      const imageHeight =
        canvas.height

      const scale =
        Math.min(
          availableWidth /
            imageWidth,
          availableHeight /
            imageHeight
        )

      const outputWidth =
        imageWidth * scale

      const outputHeight =
        imageHeight * scale

      const x =
        (pdfWidth -
          outputWidth) /
        2

      const y =
        (pdfHeight -
          outputHeight) /
        2

      pdf.addImage(
        imageData,
        'JPEG',
        x,
        y,
        outputWidth,
        outputHeight
      )

      // =========================
      // 保存
      // =========================
      pdf.save(
        `${storeName}_${year}年${month}月_シフト.pdf`
      )
    } catch (error) {
      console.error(error)

      alert(
        'PDFの作成に失敗しました'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handlePdf}
      disabled={
        loading
      }
      className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
    >
      {loading
        ? 'PDF作成中...'
        : 'PDF出力'}
    </button>
  )
}