// import { PDFDocument, rgb } from "pdf-lib";

// export type InvoiceApiData = {
//   id: number;
//   invoice_no: string;
//   tax_point: string | null;
//   check_no: string | null;
//   invoice_name_address: string | null;
//   collection_address: string | null;
//   issued_by: string | null;
//   invoiced_by: string | null;
//   inspection_image_url: string | null;
//   make: string | null;
//   model: string | null;
//   chassis_no: string | null;
//   registration: string | null;
//   purchased_by: string | null;

//   mot_end: string | Date | null;
//   mileage: number | null;
//   dor: string | null;
//   colour: string | null;
//   interior_colour: string | null;
//   purchase_date: string | Date | null;
//   collection_date: string | Date | null;

//   bank_name: string | null;
//   account_number: string | null;
//   sort_code: string | null;
//   ref: string | null;
//   acc_name: string | null;
//   sub_total: string | null;
//   vat_at_20: string | null;
//   total: string | null;
//   deposit_paid: string | null;
//   balance_due: string | null;
//   description_of_goods: string | null;
//   notes: string | null;

//   upload_date: string | Date | null;
//   created_at: string | Date | null;
//   updated_at: string | Date | null;
// };


// const formatDate = (iso?: string | null) =>
//   iso ? new Date(iso).toLocaleDateString("en-GB") : "";

// export async function generateInvoicePdf(data: InvoiceApiData) {
//   // 1) Load template PDF from /public
//   const templateBytes = await fetch("/invoice-template.pdf", {cache: "no-store"}).then(
//     (res) => res.arrayBuffer()
//   );
//   const pdfDoc = await PDFDocument.load(templateBytes);
//   const form = pdfDoc.getForm();

//   //
//   // 2) FILL FIELDS (mapping your JSON -> PDF field names)
//   //

//   // Top invoice info
//   form.getTextField("Invoice No").setText(data.invoice_no || "");
//   form.getTextField("Tax Point").setText(data.tax_point || "");
//   form.getTextField("Stock No").setText(String(data.id ?? ""));

//   // Invoice party
//   form.getTextField("Invoice Name").setText("");
//   form.getTextField("Invoice Address").setText(data.invoice_name_address || "");
//   form.getTextField("Invoice Phone Number").setText("");
//   form.getTextField("Invoice Email Address").setText("");

//   // Collection party
//   form.getTextField("Collection Name").setText("");
//   form.getTextField("Collection Address").setText(
//     data.collection_address || ""
//   );
//   form.getTextField("Collection Phone Number").setText("");
//   form.getTextField("Collection Email Address").setText("");

//   // Vehicle details (page 1)
//   form.getTextField("Make").setText(data.make || "");
//   form.getTextField("Model").setText(data.model || "");
//   form.getTextField("Chassis No").setText(data.chassis_no || "");
//   form.getTextField("Registration").setText(data.registration || "");
//   form.getTextField("Colour").setText(data.colour || "");
//   form.getTextField("Interior Colour").setText(data.interior_colour || "");
//   form.getTextField("MOT End").setText(formatDate(data.mot_end as string));
//   form.getTextField("Purchase Date").setText(
//     formatDate(data.purchase_date as string)
//   );
//   form.getTextField("Collection Date").setText(
//     formatDate(data.collection_date as string)
//   );
//   form.getTextField("Mileage").setText(String(data.mileage ?? ""));
//   form.getTextField("DOR").setText(data.dor || "");

//   // Buyer / raised by
//   form.getTextField("Buyer").setText(data.purchased_by || "");
//   form.getTextField("Raised By").setText(data.issued_by || "");
//   form.getTextField("Invoiced By").setText(data.invoiced_by || "");

//   // Line item
//   form.getTextField("Description").setText(data.description_of_goods || "");
//   form.getTextField("Quantity").setText("1");
//   form.getTextField("Unit Price").setText(data.sub_total || "");
//   form.getTextField("Actual Price").setText(data.sub_total || "");

//   form.getTextField("Description 2").setText("");
//   form.getTextField("Qty").setText("");

//   // Notes
//   form.getTextField("Notes").setText(data.notes || "");

//   // Bank / payment details
//   form.getTextField("Bank Name ").setText(data.bank_name || "");
//   form.getTextField("Account Number ").setText(data.account_number || "");
//   form.getTextField("Sort Code").setText(data.sort_code || "");
//   form.getTextField("Ref").setText(data.ref || "");
//   form.getTextField("Account Name").setText(data.acc_name || "");

//   // Totals
//   form.getTextField("Sub Total").setText(data.sub_total || "");
//   form.getTextField("VAT").setText(data.vat_at_20 || "");
//   form.getTextField("Total").setText(data.total || "");
//   form.getTextField("Deposit").setText(data.deposit_paid || "");
//   form.getTextField("Finance").setText("");
//   form.getTextField("Balance").setText(data.balance_due || "");

//   //
//   // 3) SECOND PAGE (vehicle inspection details)
//   //
//   form.getTextField("Reg").setText(data.registration || "");
//   form.getTextField("Mile").setText(String(data.mileage ?? ""));
//   form.getTextField("Date").setText(formatDate(data.upload_date as string));
//   form.getTextField("Name").setText(data.purchased_by || "");
//   form.getTextField("Comments").setText(data.notes || "");

//   //
//   // 4) IMAGE (CLOUDINARY URL – NO PREFIXING)
//   //
//   if (data.inspection_image_url) {
//     const imageUrl = data.inspection_image_url; // already a full URL

//     const res = await fetch(imageUrl);

//     if (!res.ok) {
//       throw new Error(`Failed to fetch image: ${res.status}`);
//     }

//     const contentType = res.headers.get("content-type") || "";
//     const imageBytes = await res.arrayBuffer();

//     let embeddedImage;

//     if (contentType.includes("png")) {
//       embeddedImage = await pdfDoc.embedPng(imageBytes);
//     } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
//       embeddedImage = await pdfDoc.embedJpg(imageBytes);
//     } else {
//       throw new Error(`Unsupported image type: ${contentType}`);
//     }

//     try {
//       form.removeField(form.getTextField("Invoice Name"));
//     } catch {}

//     try {
//       form.removeField(form.getTextField("Collection Name"));
//     } catch {}

//     const pages = pdfDoc.getPages();
//     const inspectionPage = pages[1];

//     const boxX = 0;
//     const boxY = 300;
//     const boxWidth = 600;
//     const boxHeight = 420;

//     const dims = embeddedImage.scale(1);
//     const scale = Math.min(boxWidth / dims.width, boxHeight / dims.height);

//     const finalWidth = dims.width * scale;
//     const finalHeight = dims.height * scale;

//     const finalX = boxX + (boxWidth - finalWidth) / 2;
//     const finalY = boxY + (boxHeight - finalHeight) / 2;

//     inspectionPage.drawRectangle({
//       x: boxX,
//       y: boxY,
//       width: boxWidth,
//       height: boxHeight,
//       color: rgb(1, 1, 1),
//     });

//     inspectionPage.drawImage(embeddedImage, {
//       x: finalX,
//       y: finalY,
//       width: finalWidth,
//       height: finalHeight,
//     });
//   }

//   //
//   // 5) Export
//   //
//   const filledBytes = await pdfDoc.save();
//   const blob = new Blob([filledBytes as unknown as BlobPart], {
//     type: "application/pdf",
//   });
//   const url = URL.createObjectURL(blob);

//   const a = document.createElement("a");
//   a.href = url;
//   a.download = `invoice-${data.invoice_no || "invoice"}.pdf`;
//   a.click();
//   URL.revokeObjectURL(url);
// }
































import { PDFDocument, rgb } from "pdf-lib";

export type InvoiceApiData = {
  id: number;
  invoice_no: string;
  tax_point: string | null;
  check_no: string | null;
  invoice_name_address: string | null;
  collection_address: string | null;
  issued_by: string | null;
  invoiced_by: string | null;
  inspection_image_url: string | null;
  make: string | null;
  model: string | null;
  chassis_no: string | null;
  registration: string | null;
  purchased_by: string | null;

  mot_end: string | Date | null;
  mileage: number | null;
  dor: string | null;
  colour: string | null;
  interior_colour: string | null;
  purchase_date: string | Date | null;
  collection_date: string | Date | null;

  bank_name: string | null;
  account_number: string | null;
  sort_code: string | null;
  ref: string | null;
  acc_name: string | null;
  sub_total: string | null;
  vat_at_20: string | null;
  total: string | null;
  deposit_paid: string | null;
  balance_due: string | null;
  description_of_goods: string | null;
  notes: string | null;

  upload_date: string | Date | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};


const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB") : "";

export async function generateInvoicePdf(data: InvoiceApiData) {
  try {
    // 1) Load template PDF from /public with cache busting
    const templateBytes = await fetch(`/invoice-template.pdf?t=${Date.now()}`, {
      cache: "no-store"
    }).then((res) => {
      console.log('Fetch response:', res.status, res.ok);
      if (!res.ok) {
        throw new Error(`Failed to fetch template: ${res.status}`);
      }
      return res.arrayBuffer();
    });

    console.log('Template loaded, size:', templateBytes.byteLength);

    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();

    //
    // 2) FILL FIELDS (mapping your JSON -> PDF field names)
    //

    // Top invoice info
    form.getTextField("Invoice No").setText(data.invoice_no || "");
    form.getTextField("Tax Point").setText(data.tax_point || "");
    form.getTextField("Stock No").setText(String(data.id ?? ""));

    // Invoice party
    form.getTextField("Invoice Name").setText("");
    form.getTextField("Invoice Address").setText(data.invoice_name_address || "");
    form.getTextField("Invoice Phone Number").setText("");
    form.getTextField("Invoice Email Address").setText("");

    // Collection party
    form.getTextField("Collection Name").setText("");
    form.getTextField("Collection Address").setText(
      data.collection_address || ""
    );
    form.getTextField("Collection Phone Number").setText("");
    form.getTextField("Collection Email Address").setText("");

    // Vehicle details (page 1)
    form.getTextField("Make").setText(data.make || "");
    form.getTextField("Model").setText(data.model || "");
    form.getTextField("Chassis No").setText(data.chassis_no || "");
    form.getTextField("Registration").setText(data.registration || "");
    form.getTextField("Colour").setText(data.colour || "");
    form.getTextField("Interior Colour").setText(data.interior_colour || "");
    form.getTextField("MOT End").setText(formatDate(data.mot_end as string));
    form.getTextField("Purchase Date").setText(
      formatDate(data.purchase_date as string)
    );
    form.getTextField("Collection Date").setText(
      formatDate(data.collection_date as string)
    );
    form.getTextField("Mileage").setText(String(data.mileage ?? ""));
    form.getTextField("DOR").setText(data.dor || "");

    // Buyer / raised by
    form.getTextField("Buyer").setText(data.purchased_by || "");
    form.getTextField("Raised By").setText(data.issued_by || "");
    form.getTextField("Invoiced By").setText(data.invoiced_by || "");

    // Line item
    form.getTextField("Description").setText(data.description_of_goods || "");
    form.getTextField("Quantity").setText("1");
    form.getTextField("Unit Price").setText(data.sub_total || "");
    form.getTextField("Actual Price").setText(data.sub_total || "");

    form.getTextField("Description 2").setText("");
    form.getTextField("Qty").setText("");

    // Notes
    form.getTextField("Notes").setText(data.notes || "");

    // Bank / payment details
    form.getTextField("Bank Name ").setText(data.bank_name || "");
    form.getTextField("Account Number ").setText(data.account_number || "");
    form.getTextField("Sort Code").setText(data.sort_code || "");
    form.getTextField("Ref").setText(data.ref || "");
    form.getTextField("Account Name").setText(data.acc_name || "");

    // Totals
    form.getTextField("Sub Total").setText(data.sub_total || "");
    form.getTextField("VAT").setText(data.vat_at_20 || "");
    form.getTextField("Total").setText(data.total || "");
    form.getTextField("Deposit").setText(data.deposit_paid || "");
    form.getTextField("Finance").setText("");
    form.getTextField("Balance").setText(data.balance_due || "");

    //
    // 3) SECOND PAGE (vehicle inspection details)
    //
    form.getTextField("Reg").setText(data.registration || "");
    form.getTextField("Mile").setText(String(data.mileage ?? ""));
    form.getTextField("Date").setText(formatDate(data.upload_date as string));
    form.getTextField("Name").setText(data.purchased_by || "");
    form.getTextField("Comments").setText(data.notes || "");

    //
    // 4) IMAGE (CLOUDINARY URL – NO PREFIXING)
    //
    if (data.inspection_image_url) {
      const imageUrl = data.inspection_image_url; // already a full URL

      const res = await fetch(imageUrl);

      if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";
      const imageBytes = await res.arrayBuffer();

      let embeddedImage;

      if (contentType.includes("png")) {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      } else {
        throw new Error(`Unsupported image type: ${contentType}`);
      }

      try {
        form.removeField(form.getTextField("Invoice Name"));
      } catch {}

      try {
        form.removeField(form.getTextField("Collection Name"));
      } catch {}

      const pages = pdfDoc.getPages();
      const inspectionPage = pages[1];

      const boxX = 0;
      const boxY = 300;
      const boxWidth = 600;
      const boxHeight = 420;

      const dims = embeddedImage.scale(1);
      const scale = Math.min(boxWidth / dims.width, boxHeight / dims.height);

      const finalWidth = dims.width * scale;
      const finalHeight = dims.height * scale;

      const finalX = boxX + (boxWidth - finalWidth) / 2;
      const finalY = boxY + (boxHeight - finalHeight) / 2;

      inspectionPage.drawRectangle({
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
      });

      inspectionPage.drawImage(embeddedImage, {
        x: finalX,
        y: finalY,
        width: finalWidth,
        height: finalHeight,
      });
    }

    //
    // 5) Export with improved download logic
    //
    const filledBytes = await pdfDoc.save();
    console.log('PDF generated, size:', filledBytes.length);

    const blob = new Blob([filledBytes], {
      type: "application/pdf",
    });
    console.log('Blob created:', blob.size);

    // Improved download approach
    const url = URL.createObjectURL(blob);
    console.log('Download URL created:', url);

    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `invoice-${data.invoice_no || "invoice"}.pdf`;
    
    document.body.appendChild(a);
    a.click();
    
    // Clean up after a short delay
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    console.log('Download triggered successfully');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}