'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

type StaffData = {
  name: string
  role: string
  shifts: Record<number, string>
  submitted: boolean
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
  const [loading, setLoading] = useState(false)

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

  function createShiftTable(
    startDay: number,
    endDay: number
  ) {
    const wrapper =
      document.createElement('div')

    wrapper.style.marginBottom = '22px'

    // =========================
    // 期間タイトル
    // =========================
    const sectionTitle =
      document.createElement('div')

    sectionTitle.style.fontSize = '16px'
    sectionTitle.style.fontWeight = 'bold'
    sectionTitle.style.marginBottom = '6px'

    sectionTitle.textContent =
      `${startDay}日〜${endDay}日`

    wrapper.appendChild(sectionTitle)

    // =========================
    // テーブル
    // =========================
    const table =
      document.createElement('table')

    table.style.borderCollapse = 'collapse'
    table.style.width = '100%'
    table.style.tableLayout = 'fixed'
    table.style.fontSize = '12px'

    // =========================
    // ヘッダー
    // =========================
    const thead =
      document.createElement('thead')

    const headerRow =
      document.createElement('tr')

    const staffHeader =
      document.createElement('th')

    staffHeader.textContent = 'スタッフ'
    staffHeader.style.border =
      '1px solid #999'
    staffHeader.style.padding = '6px'
    staffHeader.style.width = '125px'
    staffHeader.style.background =
      '#eeeeee'
    staffHeader.style.textAlign =
      'center'

    headerRow.appendChild(staffHeader)

    for (
      let day = startDay;
      day <= endDay;
      day++
    ) {
      const th =
        document.createElement('th')

      th.style.border =
        '1px solid #999'

      th.style.padding = '5px 2px'

      th.style.background =
        '#eeeeee'

      th.style.textAlign =
        'center'

      th.innerHTML =
        `${day}<br>` +
        `<span style="font-size:9px;font-weight:normal;">` +
        `${getWeek(day)}` +
        `</span>`

      headerRow.appendChild(th)
    }

    thead.appendChild(headerRow)
    table.appendChild(thead)

    // =========================
    // 本体
    // =========================
    const tbody =
      document.createElement('tbody')

    staffData.forEach((staff) => {
      const row =
        document.createElement('tr')

      // =========================
      // スタッフ名
      // =========================
      const nameCell =
        document.createElement('td')

      nameCell.style.border =
        '1px solid #999'

      nameCell.style.padding = '6px'

      nameCell.style.width = '125px'

      nameCell.style.wordBreak =
        'break-word'

      nameCell.innerHTML =
        `<strong>${staff.name}</strong>` +
        `<br>` +
        `<span style="font-size:9px;">` +
        `${staff.role}` +
        `</span>`

      row.appendChild(nameCell)

      // =========================
      // 各日のシフト
      // =========================
      for (
        let day = startDay;
        day <= endDay;
        day++
      ) {
        const cell =
          document.createElement('td')

        cell.style.border =
          '1px solid #999'

        cell.style.padding =
          '6px 2px'

        cell.style.textAlign =
          'center'

        cell.style.verticalAlign =
          'middle'

        cell.style.fontSize =
          '11px'

        cell.style.lineHeight =
          '1.25'

        cell.style.whiteSpace =
          'normal'

        cell.style.wordBreak =
          'break-word'

        // =========================
        // シフト表示
        // =========================
        const shift =
          staff.shifts[day]

        if (
          shift &&
          shift.trim() !== ''
        ) {
          // 入力済み
          cell.textContent = shift
        } else if (
          staff.submitted
        ) {
          // 提出済み＋未入力
          cell.textContent = '休'
        } else {
          // 未提出＋未入力
          cell.textContent = ''
        }

        row.appendChild(cell)
      }

      tbody.appendChild(row)
    })

    table.appendChild(tbody)
    wrapper.appendChild(table)

    return wrapper
  }

  async function handlePdf() {
    setLoading(true)

    let container:
      | HTMLDivElement
      | null = null

    try {
      // =========================
      // PDF用HTML
      // =========================
      container =
        document.createElement('div')

      container.style.position =
        'fixed'

      container.style.left =
        '-10000px'

      container.style.top = '0'

      container.style.background =
        '#ffffff'

      container.style.padding =
        '24px'

      container.style.width =
        '1400px'

      container.style.fontFamily =
        'Arial, sans-serif'

      container.style.color =
        '#000000'

      // =========================
      // タイトル
      // =========================
      const title =
        document.createElement('div')

      title.style.fontSize = '26px'
      title.style.fontWeight = 'bold'
      title.style.marginBottom = '5px'

      title.textContent =
        `${storeName} シフト表`

      container.appendChild(title)

      const subtitle =
        document.createElement('div')

      subtitle.style.fontSize = '18px'
      subtitle.style.marginBottom =
        '18px'

      subtitle.textContent =
        `${year}年${month}月`

      container.appendChild(subtitle)

      // =========================
      // 1日〜15日
      // =========================
      container.appendChild(
        createShiftTable(
          1,
          Math.min(
            15,
            daysInMonth
          )
        )
      )

      // =========================
      // 16日〜月末
      // =========================
      if (daysInMonth >= 16) {
        container.appendChild(
          createShiftTable(
            16,
            daysInMonth
          )
        )
      }

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

      const imageData =
        canvas.toDataURL(
          'image/jpeg',
          0.95
        )

      // =========================
      // PDF作成
      // =========================
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth =
        pdf.internal.pageSize.getWidth()

      const pdfHeight =
        pdf.internal.pageSize.getHeight()

      const margin = 6

      const availableWidth =
        pdfWidth - margin * 2

      const availableHeight =
        pdfHeight - margin * 2

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
        (
          pdfWidth -
          outputWidth
        ) / 2

      const y =
        (
          pdfHeight -
          outputHeight
        ) / 2

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
      if (
        container &&
        document.body.contains(
          container
        )
      ) {
        document.body.removeChild(
          container
        )
      }

      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handlePdf}
      disabled={loading}
      className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
    >
      {loading
        ? 'PDF作成中...'
        : 'PDF出力'}
    </button>
  )
}