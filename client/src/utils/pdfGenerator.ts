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
  
  // Estimate number and details - positioned to align with business address area
  const estimateHeaderY = 20;
  const businessAddressY = yPosition - 12; // Move up one line (4 units higher)
  
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text(estimate.estimate_number, 150, estimateHeaderY);
  
  // Estimate details aligned with business address
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Estimate Date: ' + formatDate(estimate.created_at), 150, businessAddressY);
  
  let detailY = businessAddressY + 4;
  if (estimate.valid_until) {
    doc.text('Valid Until: ' + formatDate(estimate.valid_until), 150, detailY);
    detailY += 4;
  }
  
  doc.text('Revision: #' + estimate.revision_number, 150, detailY);
  
  // Estimate title with status aligned to it
  yPosition = Math.max(yPosition + 15, estimateHeaderY + 35);
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text('ESTIMATE', 20, yPosition);
  
  // Status aligned with ESTIMATE title
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
  
  // Client information - Two column layout
  yPosition += 15;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  
  // Bill To section (left column)
  doc.text('Bill To:', 20, yPosition);
  
  // Job Address section (right column)
  const hasJobAddress = estimate.job_address || estimate.job_city || estimate.job_state || estimate.job_zip_code;
  if (hasJobAddress) {
    doc.text('Job Address:', 105, yPosition);
  }
  
  const billStartY = yPosition + 8;
  let billY = billStartY;
  let jobY = billStartY;
  
  // Bill To details (left column)
  doc.setFontSize(10);
  doc.text(estimate.client_name || 'N/A', 20, billY);
  billY += 5;
  
  if (estimate.client_email) {
    doc.text(estimate.client_email, 20, billY);
    billY += 5;
  }
  if (estimate.client_phone) {
    doc.text(estimate.client_phone, 20, billY);
    billY += 5;
  }
  if (estimate.client_address) {
    doc.text(estimate.client_address, 20, billY);
    billY += 5;
  }
  const clientLocation = [estimate.client_city, estimate.client_state, estimate.client_zip_code].filter(Boolean).join(', ');
  if (clientLocation) {
    doc.text(clientLocation, 20, billY);
    billY += 5;
  }
  
  // Job Address details (right column)
  if (hasJobAddress) {
    if (estimate.job_address) {
      doc.text(estimate.job_address, 105, jobY);
      jobY += 5;
    }
    const jobLocation = [estimate.job_city, estimate.job_state, estimate.job_zip_code].filter(Boolean).join(', ');
    if (jobLocation) {
      doc.text(jobLocation, 105, jobY);
      jobY += 5;
    }
  }
  
  // Set yPosition to the bottom of whichever column is longer
  yPosition = Math.max(billY, jobY);
  
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
    const tableData = estimate.project_areas.map(area => {
      // Calculate labor amount (hours × rate)
      const baseLaborAmount = (area.labor_hours || 0) * (area.labor_rate || 0);
      const baseMaterialAmount = area.material_cost || 0;
      
      // Apply markup to both labor and material
      const markupMultiplier = 1 + (estimate.markup_percentage / 100);
      const laborWithMarkup = baseLaborAmount * markupMultiplier;
      const materialWithMarkup = baseMaterialAmount * markupMultiplier;
      
      return [
        area.area_name,
        area.area_type,
        laborWithMarkup > 0 ? formatCurrency(laborWithMarkup) : 'N/A',
        materialWithMarkup > 0 ? formatCurrency(materialWithMarkup) : 'N/A'
      ];
    });
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Area', 'Type', 'Labour Amount', 'Material Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 }
      },
      margin: { left: 20, right: 20 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Two-column layout: Terms and Notes on left, Cost breakdown on right
  const afterTableY = yPosition;
  
  // Left column: Terms and Notes
  if (estimate.terms_and_notes && estimate.terms_and_notes.trim()) {
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235); // Blue header
    doc.text('Terms and Notes:', 20, yPosition);
    
    yPosition += 8;
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const splitTerms = doc.splitTextToSize(estimate.terms_and_notes, 85); // Narrower width for left column
    doc.text(splitTerms, 20, yPosition);
  }
  
  // Right column: Cost breakdown
  const costStartY = afterTableY;
  const markupMultiplier = 1 + (estimate.markup_percentage / 100);
  const laborWithMarkup = estimate.labor_cost * markupMultiplier;
  const materialWithMarkup = estimate.material_cost * markupMultiplier;
  
  const costData = [
    ['Labor Cost', formatCurrency(laborWithMarkup)],
    ['Material Cost', formatCurrency(materialWithMarkup)],
    ['Total Amount', formatCurrency(estimate.total_amount)]
  ];
  
  autoTable(doc, {
    startY: costStartY,
    body: costData,
    theme: 'plain',
    bodyStyles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 65, halign: 'right', fontStyle: 'bold' },
      1: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 85, right: 20 } // Align with project areas table right margin
  });
  
  // Total highlight - positioned to align with cost table
  const totalY = (doc as any).lastAutoTable.finalY + 5;
  doc.setFillColor(37, 99, 235);
  doc.rect(125, totalY, 50, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('TOTAL: ' + formatCurrency(estimate.total_amount), 150, totalY + 7, { align: 'center' });
  
  // Update yPosition to the bottom of whichever column is longer
  const termsEndY = estimate.terms_and_notes ? 
    afterTableY + 8 + Math.ceil(doc.splitTextToSize(estimate.terms_and_notes, 85).length * 4) : afterTableY;
  yPosition = Math.max(termsEndY, totalY + 20);
  
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
  
  // Invoice number and details - positioned to align with business address area
  const invoiceHeaderY = 20;
  const businessAddressY = yPosition - 12; // Move up one line (4 units higher)
  
  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text(invoice.invoice_number, 150, invoiceHeaderY);
  
  // Invoice details aligned with business address
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Invoice Date: ' + formatDate(invoice.created_at), 150, businessAddressY);
  
  let detailY = businessAddressY + 4;
  if (invoice.due_date) {
    doc.text('Due Date: ' + formatDate(invoice.due_date), 150, detailY);
    detailY += 4;
  }
  
  doc.text('Payment Terms: ' + invoice.payment_terms, 150, detailY);
  detailY += 4;
  
  if (invoice.estimate_number) {
    doc.text('From Estimate: ' + invoice.estimate_number, 150, detailY);
  }
  
  // Invoice title with status aligned to it
  yPosition = Math.max(yPosition + 15, invoiceHeaderY + 35);
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', 20, yPosition);
  
  // Status aligned with INVOICE title
  doc.setFontSize(10);
  const statusColor = invoice.status === 'paid' ? [34, 197, 94] : [239, 68, 68];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(invoice.status.toUpperCase(), 150, yPosition);
  
  // Client information - Two column layout
  yPosition += 15;
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  
  // Bill To section (left column)
  doc.text('Bill To:', 20, yPosition);
  
  // Job Address section (right column)
  const hasJobAddress = invoice.job_address || invoice.job_city || invoice.job_state || invoice.job_zip_code;
  if (hasJobAddress) {
    doc.text('Job Address:', 105, yPosition);
  }
  
  const billStartY = yPosition + 8;
  let billY = billStartY;
  let jobY = billStartY;
  
  // Bill To details (left column)
  doc.setFontSize(10);
  doc.text(invoice.client_name || 'N/A', 20, billY);
  billY += 5;
  
  if (invoice.client_email) {
    doc.text(invoice.client_email, 20, billY);
    billY += 5;
  }
  if (invoice.client_phone) {
    doc.text(invoice.client_phone, 20, billY);
    billY += 5;
  }
  if (invoice.client_address) {
    doc.text(invoice.client_address, 20, billY);
    billY += 5;
  }
  const clientLocation = [invoice.client_city, invoice.client_state, invoice.client_zip_code].filter(Boolean).join(', ');
  if (clientLocation) {
    doc.text(clientLocation, 20, billY);
    billY += 5;
  }
  
  // Job Address details (right column)
  if (hasJobAddress) {
    if (invoice.job_address) {
      doc.text(invoice.job_address, 105, jobY);
      jobY += 5;
    }
    const jobLocation = [invoice.job_city, invoice.job_state, invoice.job_zip_code].filter(Boolean).join(', ');
    if (jobLocation) {
      doc.text(jobLocation, 105, jobY);
      jobY += 5;
    }
  }
  
  // Set yPosition to the bottom of whichever column is longer
  yPosition = Math.max(billY, jobY);
  
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
    const tableData = invoice.project_areas.map(area => {
      // Calculate labor amount (hours × rate)
      const baseLaborAmount = (area.labor_hours || 0) * (area.labor_rate || 0);
      const baseMaterialAmount = area.material_cost || 0;
      
      // For invoices, amounts are already final (markup already applied during conversion)
      const laborWithMarkup = baseLaborAmount;
      const materialWithMarkup = baseMaterialAmount;
      
      return [
        area.area_name,
        area.area_type,
        laborWithMarkup > 0 ? formatCurrency(laborWithMarkup) : 'N/A',
        materialWithMarkup > 0 ? formatCurrency(materialWithMarkup) : 'N/A'
      ];
    });
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Area', 'Type', 'Labour Amount', 'Material Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 }
      },
      margin: { left: 20, right: 20 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Two-column layout: Terms and Notes on left, Payment summary on right
  const afterTableY = yPosition;
  
  // Left column: Terms and Notes
  if (invoice.terms_and_notes && invoice.terms_and_notes.trim()) {
    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235); // Blue header
    doc.text('Terms and Notes:', 20, yPosition);
    
    yPosition += 8;
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const splitTerms = doc.splitTextToSize(invoice.terms_and_notes, 85); // Narrower width for left column
    doc.text(splitTerms, 20, yPosition);
  }
  
  // Right column: Payment summary
  const paymentStartY = afterTableY;
  const outstandingAmount = invoice.total_amount - invoice.paid_amount;
  const paymentData = [
    ['Total Amount', formatCurrency(invoice.total_amount)],
    ['Amount Paid', formatCurrency(invoice.paid_amount)],
    ['Outstanding Balance', formatCurrency(outstandingAmount)]
  ];
  
  autoTable(doc, {
    startY: paymentStartY,
    body: paymentData,
    theme: 'plain',
    bodyStyles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 65, halign: 'right', fontStyle: 'bold' },
      1: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 85, right: 20 } // Align with right side
  });
  
  // Outstanding balance highlight - positioned to align with payment table
  const balanceY = (doc as any).lastAutoTable.finalY + 5;
  const balanceColor = outstandingAmount > 0 ? [239, 68, 68] : [34, 197, 94];
  doc.setFillColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.rect(125, balanceY, 50, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  const balanceText = outstandingAmount > 0 ? `DUE: ${formatCurrency(outstandingAmount)}` : 'PAID IN FULL';
  doc.text(balanceText, 150, balanceY + 7, { align: 'center' });
  
  // Update yPosition to the bottom of whichever column is longer
  const termsEndY = invoice.terms_and_notes ? 
    afterTableY + 8 + Math.ceil(doc.splitTextToSize(invoice.terms_and_notes, 85).length * 4) : afterTableY;
  yPosition = Math.max(termsEndY, balanceY + 20);
  
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