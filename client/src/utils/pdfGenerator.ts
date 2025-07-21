import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Estimate, Invoice } from '../services/api';

interface PDFOptions {
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  logo?: string;
}

const defaultOptions: PDFOptions = {
  companyName: 'Painting Business Manager',
  companyAddress: '123 Business Street, City, State 12345',
  companyPhone: '(555) 123-4567',
  companyEmail: 'info@paintingbusiness.com',
};

// Fetch company settings from API
const fetchCompanySettings = async (): Promise<PDFOptions> => {
  try {
    const response = await fetch('/api/company-settings');
    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return {
          companyName: result.data.company_name || defaultOptions.companyName,
          companyAddress: result.data.company_address || defaultOptions.companyAddress,
          companyPhone: result.data.company_phone || defaultOptions.companyPhone,
          companyEmail: result.data.company_email || defaultOptions.companyEmail,
          logo: result.data.logo_url || undefined,
        };
      }
    }
  } catch (error) {
    console.error('Error fetching company settings for PDF:', error);
  }
  return defaultOptions;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

export const generateEstimatePDF = async (estimate: Estimate, options: PDFOptions = {}): Promise<void> => {
  const companySettings = await fetchCompanySettings();
  const opts = { ...companySettings, ...options };
  const doc = new jsPDF();
  
  // Set up fonts and colors
  doc.setFont('helvetica');
  
  let yPosition = 20;
  let logoWidth = 0;
  
  // Add logo if available
  if (opts.logo && opts.logo !== '/placeholder-logo.png' && opts.logo.startsWith('data:image/')) {
    try {
      // Determine image format from data URL
      let imageFormat = 'JPEG';
      if (opts.logo.includes('data:image/png')) {
        imageFormat = 'PNG';
      } else if (opts.logo.includes('data:image/gif')) {
        imageFormat = 'GIF';
      }
      
      // Add logo on the left
      doc.addImage(opts.logo, imageFormat, 20, yPosition - 5, 25, 25);
      logoWidth = 30; // Logo width + margin
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
    }
  }
  
  // Header with company info - positioned to the right of logo
  const headerStartX = 20 + logoWidth;
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235); // Blue color
  doc.text(opts.companyName || 'Painting Business', headerStartX, yPosition);
  
  yPosition += 7;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  
  // Split address into lines to prevent overlap
  const addressLines = (opts.companyAddress || '').split('\n');
  for (const line of addressLines) {
    if (line.trim()) {
      doc.text(line.trim(), headerStartX, yPosition);
      yPosition += 4;
    }
  }
  
  // Phone and Email on separate lines to prevent overlap
  doc.text(`Phone: ${opts.companyPhone || ''}`, headerStartX, yPosition);
  yPosition += 4;
  doc.text(`Email: ${opts.companyEmail || ''}`, headerStartX, yPosition);
  
  // Estimate title and number
  yPosition += 15;
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text('ESTIMATE', 20, yPosition);
  
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text(estimate.estimate_number, 150, yPosition);
  
  // Status badge
  yPosition += 8;
  doc.setFontSize(10);
  const statusColors: { [key: string]: [number, number, number] } = {
    'draft': [156, 163, 175],
    'sent': [59, 130, 246],
    'approved': [34, 197, 94],
    'rejected': [239, 68, 68],
    'converted': [147, 51, 234]
  };
  const statusColor = statusColors[estimate.status] || [156, 163, 175];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(estimate.status.toUpperCase(), 150, yPosition);
  
  // Client information
  yPosition += 15;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Bill To:', 20, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.text(estimate.client_name || 'N/A', 20, yPosition);
  if (estimate.client_email) {
    yPosition += 5;
    doc.text(estimate.client_email, 20, yPosition);
  }
  if (estimate.client_phone) {
    yPosition += 5;
    doc.text(estimate.client_phone, 20, yPosition);
  }
  
  // Estimate details
  doc.setFontSize(10);
  const detailsY = yPosition - 20;
  doc.text('Estimate Date:', 120, detailsY);
  doc.text(formatDate(estimate.created_at), 160, detailsY);
  
  if (estimate.valid_until) {
    doc.text('Valid Until:', 120, detailsY + 5);
    doc.text(formatDate(estimate.valid_until), 160, detailsY + 5);
  }
  
  doc.text('Revision:', 120, detailsY + 10);
  doc.text(`#${estimate.revision_number}`, 160, detailsY + 10);
  
  // Project title and description
  yPosition += 15;
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text(estimate.title, 20, yPosition);
  
  if (estimate.description) {
    yPosition += 8;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const splitDescription = doc.splitTextToSize(estimate.description, 170);
    doc.text(splitDescription, 20, yPosition);
    yPosition += splitDescription.length * 4;
  }
  
  // Project areas table
  yPosition += 10;
  
  if (estimate.project_areas && estimate.project_areas.length > 0) {
    const tableData = estimate.project_areas.map(area => [
      area.area_name,
      area.area_type,
      area.square_footage ? `${area.square_footage} sq ft` : 'N/A',
      area.paint_color || 'N/A',
      area.labor_hours ? `${area.labor_hours}h` : 'N/A',
      area.material_cost ? formatCurrency(area.material_cost) : 'N/A'
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Area', 'Type', 'Size', 'Paint Color', 'Labor', 'Materials']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 20 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 }
      },
      margin: { left: 20, right: 20 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Cost breakdown
  const costData = [
    ['Labor Cost', formatCurrency(estimate.labor_cost)],
    ['Material Cost', formatCurrency(estimate.material_cost)],
    ['Markup (' + estimate.markup_percentage + '%)', formatCurrency((estimate.labor_cost + estimate.material_cost) * (estimate.markup_percentage / 100))],
    ['Total Amount', formatCurrency(estimate.total_amount)]
  ];
  
  autoTable(doc, {
    startY: yPosition,
    body: costData,
    theme: 'plain',
    bodyStyles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 140, halign: 'right', fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 20, right: 20 }
  });
  
  // Total highlight - with proper spacing
  yPosition = (doc as any).lastAutoTable.finalY + 10; // More spacing after table
  doc.setFillColor(37, 99, 235);
  doc.rect(140, yPosition, 50, 12, 'F'); // Increased height and proper position
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('TOTAL: ' + formatCurrency(estimate.total_amount), 165, yPosition + 7, { align: 'center' }); // Better vertical centering
  
  yPosition += 20; // More space after highlight box
  
  // Terms and Notes section - with better spacing control
  if (estimate.terms_and_notes && estimate.terms_and_notes.trim() && yPosition < 220) {
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235); // Blue header
    doc.text('Terms and Notes:', 20, yPosition);
    
    yPosition += 10; // Increased spacing
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const splitTerms = doc.splitTextToSize(estimate.terms_and_notes, 170);
    const maxLines = Math.floor((240 - yPosition) / 5); // More conservative spacing
    const termLines = splitTerms.slice(0, Math.max(1, maxLines)); // Always show at least 1 line
    doc.text(termLines, 20, yPosition);
    yPosition += termLines.length * 5; // More line spacing
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text('Thank you for your business!', 105, pageHeight - 20, { align: 'center' });
  doc.text('This estimate is valid for 30 days from the date issued.', 105, pageHeight - 15, { align: 'center' });
  
  // Save the PDF
  doc.save(`${estimate.estimate_number}_${estimate.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};

export const generateInvoicePDF = async (invoice: Invoice, options: PDFOptions = {}): Promise<void> => {
  const companySettings = await fetchCompanySettings();
  const opts = { ...companySettings, ...options };
  const doc = new jsPDF();
  
  // Set up fonts and colors
  doc.setFont('helvetica');
  
  let yPosition = 20;
  let logoWidth = 0;
  
  // Add logo if available
  if (opts.logo && opts.logo !== '/placeholder-logo.png' && opts.logo.startsWith('data:image/')) {
    try {
      // Determine image format from data URL
      let imageFormat = 'JPEG';
      if (opts.logo.includes('data:image/png')) {
        imageFormat = 'PNG';
      } else if (opts.logo.includes('data:image/gif')) {
        imageFormat = 'GIF';
      }
      
      // Add logo on the left
      doc.addImage(opts.logo, imageFormat, 20, yPosition - 5, 25, 25);
      logoWidth = 30; // Logo width + margin
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
    }
  }
  
  // Header with company info - positioned to the right of logo
  const headerStartX = 20 + logoWidth;
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235); // Blue color
  doc.text(opts.companyName || 'Painting Business', headerStartX, yPosition);
  
  yPosition += 7;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  
  // Split address into lines to prevent overlap
  const addressLines = (opts.companyAddress || '').split('\n');
  for (const line of addressLines) {
    if (line.trim()) {
      doc.text(line.trim(), headerStartX, yPosition);
      yPosition += 4;
    }
  }
  
  // Phone and Email on separate lines to prevent overlap
  doc.text(`Phone: ${opts.companyPhone || ''}`, headerStartX, yPosition);
  yPosition += 4;
  doc.text(`Email: ${opts.companyEmail || ''}`, headerStartX, yPosition);
  
  // Invoice title and number
  yPosition += 15;
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', 20, yPosition);
  
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text(invoice.invoice_number, 150, yPosition);
  
  // Status and payment status
  yPosition += 8;
  doc.setFontSize(10);
  const statusColor = invoice.status === 'paid' ? [34, 197, 94] : [239, 68, 68];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(invoice.status.toUpperCase(), 150, yPosition);
  
  // Client information
  yPosition += 15;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Bill To:', 20, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.text(invoice.client_name || 'N/A', 20, yPosition);
  if (invoice.client_email) {
    yPosition += 5;
    doc.text(invoice.client_email, 20, yPosition);
  }
  if (invoice.client_phone) {
    yPosition += 5;
    doc.text(invoice.client_phone, 20, yPosition);
  }
  
  // Invoice details
  doc.setFontSize(10);
  const detailsY = yPosition - 20;
  doc.text('Invoice Date:', 120, detailsY);
  doc.text(formatDate(invoice.created_at), 160, detailsY);
  
  if (invoice.due_date) {
    doc.text('Due Date:', 120, detailsY + 5);
    doc.text(formatDate(invoice.due_date), 160, detailsY + 5);
  }
  
  doc.text('Payment Terms:', 120, detailsY + 10);
  doc.text(invoice.payment_terms, 160, detailsY + 10);
  
  if (invoice.estimate_number) {
    doc.text('From Estimate:', 120, detailsY + 15);
    doc.text(invoice.estimate_number, 160, detailsY + 15);
  }
  
  // Project title and description
  yPosition += 20;
  doc.setFontSize(14);
  doc.setTextColor(37, 99, 235);
  doc.text(invoice.title, 20, yPosition);
  
  if (invoice.description) {
    yPosition += 8;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const splitDescription = doc.splitTextToSize(invoice.description, 170);
    doc.text(splitDescription, 20, yPosition);
    yPosition += splitDescription.length * 4;
  }
  
  // Project areas table (if available)
  yPosition += 10;
  
  if (invoice.project_areas && invoice.project_areas.length > 0) {
    const tableData = invoice.project_areas.map(area => [
      area.area_name,
      area.area_type,
      area.square_footage ? `${area.square_footage} sq ft` : 'N/A',
      area.paint_color || 'N/A',
      area.labor_hours ? `${area.labor_hours}h` : 'N/A',
      area.material_cost ? formatCurrency(area.material_cost) : 'N/A'
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Area', 'Type', 'Size', 'Paint Color', 'Labor', 'Materials']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 20 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 }
      },
      margin: { left: 20, right: 20 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Payment summary
  const outstandingAmount = invoice.total_amount - invoice.paid_amount;
  const paymentData = [
    ['Total Amount', formatCurrency(invoice.total_amount)],
    ['Amount Paid', formatCurrency(invoice.paid_amount)],
    ['Outstanding Balance', formatCurrency(outstandingAmount)]
  ];
  
  autoTable(doc, {
    startY: yPosition,
    body: paymentData,
    theme: 'plain',
    bodyStyles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 140, halign: 'right', fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 20, right: 20 }
  });
  
  // Outstanding balance highlight - positioned to avoid overlap
  yPosition = (doc as any).lastAutoTable.finalY + 10; // More spacing after table
  const balanceColor = outstandingAmount > 0 ? [239, 68, 68] : [34, 197, 94];
  doc.setFillColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.rect(140, yPosition, 50, 12, 'F'); // Increased height further and proper position
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  const balanceText = outstandingAmount > 0 ? `DUE: ${formatCurrency(outstandingAmount)}` : 'PAID IN FULL';
  doc.text(balanceText, 165, yPosition + 7, { align: 'center' }); // Better vertical centering
  
  yPosition += 20; // More space after highlight box
  
  // Payment history (if any) - with better spacing
  if (invoice.payments && invoice.payments.length > 0 && yPosition < 180) {
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Payment History:', 20, yPosition);
    
    yPosition += 10; // Increased spacing
    const paymentTableData = invoice.payments.map(payment => [
      formatDate(payment.payment_date),
      payment.payment_method || 'N/A',
      payment.reference_number || '',
      formatCurrency(payment.amount)
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: paymentTableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { cellWidth: 25, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15; // More space after table
  }
  
  // Terms and Notes section - with better spacing control
  if (invoice.terms_and_notes && invoice.terms_and_notes.trim() && yPosition < 220) {
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235); // Blue header
    doc.text('Terms and Notes:', 20, yPosition);
    
    yPosition += 10; // Increased spacing
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const splitTerms = doc.splitTextToSize(invoice.terms_and_notes, 170);
    const maxLines = Math.floor((240 - yPosition) / 5); // More conservative spacing
    const termLines = splitTerms.slice(0, Math.max(1, maxLines)); // Always show at least 1 line
    doc.text(termLines, 20, yPosition);
    yPosition += termLines.length * 5; // More line spacing
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.text('Thank you for your business!', 105, pageHeight - 20, { align: 'center' });
  if (outstandingAmount > 0) {
    doc.text(`Payment due by ${invoice.due_date ? formatDate(invoice.due_date) : 'N/A'}`, 105, pageHeight - 15, { align: 'center' });
  }
  
  // Save the PDF
  doc.save(`${invoice.invoice_number}_${invoice.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
};