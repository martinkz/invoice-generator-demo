import { Context } from "netlify:edge";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  const response = await context.next();
  let text = await response.text();

  if (url.searchParams.get("id") === null) {
    return new Response(null, response);
  }

  let invoiceName: string;
  invoiceName = url.searchParams.get("id")!;

  let sheetId: string = Deno.env.get("GOOGLE_SHEET_ID");
  let sheetKey: string = Deno.env.get("GOOGLE_SHEET_KEY");

  context.log(`Transforming ${url} for name: ${invoiceName}`);

  // Get all sheet names: https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets%2Fproperties%2Ftitle&key=${sheetKey}
  // From https://stackoverflow.com/questions/55018655/get-all-data-of-multiple-worksheet-in-google-api-in-js
  const jsonResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1?key=${sheetKey}`);
  const data = await jsonResponse.json();

  const columnNames = data.values.shift();
  const tokenNames = columnNames.map((item: string) => `{{${item}}}`);
  const invoiceData = data.values;
  let currentInvoice = invoiceData.find((item: string) => item.includes(invoiceName));

  if(!currentInvoice){
    return new Response('<!doctype html><html><body>Invoice ID not found.</body></html>', response);
  }

  currentInvoice.length = currentInvoice.length - 1; // Remove the last column, as it's not used

  currentInvoice.forEach( (val: string, idx: string) =>  text = text.replaceAll(tokenNames[idx], val) );

  return new Response(text, response);
};