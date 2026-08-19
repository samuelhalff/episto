export type ReceiptLocale = "de-CH" | "fr-CH" | "it-CH" | "en-CH";

export interface ReceiptCopy {
  title: string;
  issuedOn: string;
  receiptNumber: string;
  orderRef: string;
  uidVat: string;
  lineItemsEyebrow: string;
  colDescription: string;
  colAmount: string;
  subtotal: string;
  subtotalBeforeDiscount: string;
  vat: string;
  total: string;
  discount: string;
  paymentMethod: string;
  deliveryType: string;
  notAvailable: string;
  footerVat: string;
  footerSupport: string;
  lineItemFallback: { postage: string; service: string };
  deliveryTypes: Record<string, string>;
}

const DEFAULT_COPY: ReceiptCopy = {
  title: "Receipt",
  issuedOn: "Date",
  receiptNumber: "Receipt number",
  orderRef: "Order reference",
  uidVat: "VAT no.",
  lineItemsEyebrow: "Services",
  colDescription: "Description",
  colAmount: "Amount CHF",
  subtotal: "Subtotal (net)",
  subtotalBeforeDiscount: "Subtotal before discount",
  vat: "VAT 8.1%",
  total: "Total",
  discount: "Discount",
  paymentMethod: "Payment method",
  deliveryType: "Delivery type",
  notAvailable: "Not available",
  footerVat: "incl. 8.1% VAT",
  footerSupport: "Questions? Contact",
  lineItemFallback: { postage: "Postage", service: "episto service" },
  deliveryTypes: {
    standard: "Standard post",
    registered: "Registered post",
  },
};

const COPY: Record<ReceiptLocale, ReceiptCopy> = {
  "en-CH": DEFAULT_COPY,
  "de-CH": {
    title: "Quittung",
    issuedOn: "Datum",
    receiptNumber: "Quittungsnummer",
    orderRef: "Bestellreferenz",
    uidVat: "MWST-Nr.",
    lineItemsEyebrow: "Leistungen",
    colDescription: "Beschreibung",
    colAmount: "Betrag CHF",
    subtotal: "Zwischentotal (netto)",
    subtotalBeforeDiscount: "Zwischentotal vor Rabatt",
    vat: "MWST 8.1%",
    total: "Total",
    discount: "Rabatt",
    paymentMethod: "Zahlungsart",
    deliveryType: "Versandart",
    notAvailable: "Nicht verfuegbar",
    footerVat: "inkl. 8.1% MWST",
    footerSupport: "Fragen? Kontaktieren Sie",
    lineItemFallback: { postage: "Postversand", service: "episto-Service" },
    deliveryTypes: {
      standard: "A-Post",
      registered: "Einschreiben",
    },
  },
  "fr-CH": {
    title: "Reçu",
    issuedOn: "Date",
    receiptNumber: "Numéro de reçu",
    orderRef: "Référence de commande",
    uidVat: "N° TVA",
    lineItemsEyebrow: "Prestations",
    colDescription: "Description",
    colAmount: "Montant CHF",
    subtotal: "Sous-total (net)",
    subtotalBeforeDiscount: "Sous-total avant remise",
    vat: "TVA 8.1%",
    total: "Total",
    discount: "Remise",
    paymentMethod: "Moyen de paiement",
    deliveryType: "Mode d'envoi",
    notAvailable: "Non disponible",
    footerVat: "TVA 8.1% incluse",
    footerSupport: "Des questions ? Contactez",
    lineItemFallback: { postage: "Envoi postal", service: "Service episto" },
    deliveryTypes: {
      standard: "Courrier standard",
      registered: "Courrier recommandé",
    },
  },
  "it-CH": {
    title: "Ricevuta",
    issuedOn: "Data",
    receiptNumber: "Numero di ricevuta",
    orderRef: "Riferimento ordine",
    uidVat: "N. IVA",
    lineItemsEyebrow: "Prestazioni",
    colDescription: "Descrizione",
    colAmount: "Importo CHF",
    subtotal: "Subtotale (netto)",
    subtotalBeforeDiscount: "Subtotale prima dello sconto",
    vat: "IVA 8.1%",
    total: "Totale",
    discount: "Sconto",
    paymentMethod: "Metodo di pagamento",
    deliveryType: "Tipo di invio",
    notAvailable: "Non disponibile",
    footerVat: "IVA 8.1% inclusa",
    footerSupport: "Domande? Contattate",
    lineItemFallback: { postage: "Spedizione postale", service: "Servizio episto" },
    deliveryTypes: {
      standard: "Posta standard",
      registered: "Raccomandata",
    },
  },
};

export function getCopy(locale: ReceiptLocale): ReceiptCopy {
  return COPY[locale] ?? DEFAULT_COPY;
}
