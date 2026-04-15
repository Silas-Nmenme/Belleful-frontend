const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } = require('docx');
const { stringify } = require('csv-stringify/sync');
const { PassThrough } = require('stream');
const fs = require('fs');

module.exports = {
  /**
   * Format orders data for export (consistent columns)
   */
formatOrdersData(orders, type = 'user') {
    return orders.map(order => {
      // Fully defensive: compute virtuals, ensure all fields exist
      const _id = order._id ? order._id.toString() : '';
      const items = Array.isArray(order.items) ? order.items : [];
      const itemCount = items.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
      const displayId = `#${_id.slice(-6).toUpperCase()}`;
      
      const safeOrder = {
        ...order,
        displayId,
        itemCount,
        totalAmount: Number(order.totalAmount || 0),
        items
      };
      
      // Safe date handling
      let orderDate;
      try {
        orderDate = new Date(safeOrder.createdAt || Date.now());
      } catch {
        orderDate = new Date();
      }
      
      const row = {
        'Order ID': displayId,
        'Date': orderDate.toLocaleDateString(),
        'Status': (safeOrder.orderStatus || 'N/A').replace(/_/g, ' ').toUpperCase(),
        'Method': (safeOrder.deliveryMethod || 'N/A').toUpperCase(),
        'Items': itemCount,
        'Total': `$${safeOrder.totalAmount.toFixed(2)}`,
        'Phone': safeOrder.phoneNumber?.trim() || 'N/A',
        'ItemsDetail': items.slice(0, 5).map(item => 
          `${item.name || 'N/A'} x${Number(item.quantity) || 1} @$${Number(item.price || 0).toFixed(2)}`
        ).join('; ') + (items.length > 5 ? '...' : '') || 'No items'
      };
      
      if (type === 'admin') {
        const userName = safeOrder.user?.name?.trim() || 
                        (safeOrder.user?.email || '').split('@')[0] || 'N/A';
        row.Customer = userName;
        row['Payment Status'] = safeOrder.paymentStatus || 'Pending';
        row['Notes'] = (safeOrder.notes || '').substring(0, 50);
      }
      
      return row;
    });
  },

  /**
   * Generate PDF with table
   */
  async generatePDF(data, filename = 'transactions.pdf') {
    return new Promise((resolve, reject) => {
      const buffers = [];
      const doc = new PDFDocument({ layout: 'landscape', margin: 50 });
      const stream = new PassThrough();
      
      doc.pipe(stream);
      
      // Header
      doc.fontSize(20).text('Transaction Report', 50, 50);
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, 50, 80);
      
      // Table headers
      const headers = Object.keys(data[0] || {});
      const headerPosition = 150;
      doc.fontSize(10).font('Helvetica-Bold');
      headers.slice(0, 8).forEach((header, i) => {  // Limit columns
        doc.text(header, 50 + i * 80, headerPosition, { width: 80 });
      });
      
      // Rows - truncate long text
      doc.font('Helvetica');
      data.slice(0, 50).forEach((row, rowIndex) => {  // Limit rows
        const yPos = headerPosition + 30 + (rowIndex * 15);
        headers.slice(0, 8).forEach((header, i) => {
          const cellText = (row[header]?.toString() || '').substring(0, 25);
          doc.text(cellText, 50 + i * 80, yPos, { width: 80 });
        });
      });
      
      doc.end();
      
      stream.on('data', chunk => buffers.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(buffers)));
      stream.on('error', reject);
    });
  },

  /**
   * Generate DOCX - Vercel-safe with fallback
   */
  async generateDOCX(data, filename = 'transactions.docx') {
    try {
      // Dynamic require for Vercel compatibility
      const docx = require('docx');
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } = docx;
      const { TextRun } = docx;
      
      const headers = Object.keys(data[0] || {});
      const rows = [headers, ...data.slice(0, 100).map(row => headers.slice(0, 8).map(h => String(row[h] || '').substring(0, 50)))];
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Transaction Report",
                  bold: true,
                  size: 28
                })
              ]
            }),
            new Paragraph({
              children: [new TextRun(`Generated: ${new Date().toLocaleString()}`)]
            }),
            new Table({
              rows: rows.map(row => new TableRow({
                children: row.map((cell, colIdx) => new TableCell({
                  children: [new Paragraph(String(cell))],
                  width: { size: 100 / Math.min(8, headers.length), type: WidthType.PERCENTAGE }
                }))
              }))
            })
          ]
        }]
      });
      
      const buffer = await Packer.toBuffer(doc);
      return buffer;
    } catch (docxErr) {
      console.error('DOCX generation failed:', docxErr.message);
      // Fallback: Return CSV as .docx-named text (better than 500)
      const csvFallback = this.generateCSV(data);
      return Buffer.from(`DOCX unavailable - CSV fallback:\n\n${csvFallback}`, 'utf-8');
    }
  },

  /**
   * Generate CSV
   */
  generateCSV(data, filename = 'transactions.csv') {
    const headers = Object.keys(data[0] || {});
    return stringify(data, { header: true, columns: headers });
  }
};
