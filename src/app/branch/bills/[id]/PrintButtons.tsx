'use client'

export default function PrintButtons() {
  const handlePrint = (type: 'a4' | 'thermal') => {
    if (typeof window !== 'undefined') {
      // Add print-specific styling based on type
      const style = document.createElement('style')
      style.textContent = `
        @media print {
          @page {
            size: ${type === 'thermal' ? '80mm' : 'A4'};
            margin: ${type === 'thermal' ? '0' : '1cm'};
          }
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `
      document.head.appendChild(style)
      window.print()
      document.head.removeChild(style)
    }
  }

  return (
    <div className="mt-8 flex gap-4">
      <button
        onClick={() => handlePrint('a4')}
        className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
      >
        Print (A4)
      </button>
      <button
        onClick={() => handlePrint('thermal')}
        className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
      >
        Print (Thermal)
      </button>
    </div>
  )
}

